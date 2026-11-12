import {
  normalizeExerciseName,
  normalizeMuscleGroups,
} from "@activity-log/ui/utils";

import type { LegacyEnvelope } from "./envelope";
import type { IdentityMapping } from "./identity";
import type { Repair } from "./scalars";
import {
  createDefaultExercises,
  createDefaultMuscleGroups,
} from "./exercise-defaults";
import { allocateLegacyIdentities } from "./identity";
import { repairNumber } from "./scalars";
import { createDefaultEquipment } from "./workout-defaults";

type Value = string | number | null;
type Row = Record<string, Value>;
type ObjectValue = Record<string, unknown>;
interface Entry {
  pointer: string;
  value: ObjectValue;
}

export interface ConvertedSettings {
  barbells: Row[];
  plates: Row[];
  exercises: Row[];
  presets: Row[];
  muscles: Row[];
  catalog: Row[];
  exerciseMuscles: Row[];
  presetMuscles: Row[];
  exerciseIds: Map<string, string>;
  identities: IdentityMapping[];
  repairs: Repair[];
}

function entries(value: unknown, pointer: string, repairs: Repair[]): Entry[] {
  if (value == null) return [];
  if (!Array.isArray(value))
    throw new Error(`Legacy collection ${pointer} is not an array.`);
  return value.flatMap((item: unknown, index: number) => {
    const itemPointer = `${pointer}/${index}`;
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      repairs.push({
        pointer: itemPointer,
        reason: "quarantined-record",
        original: item,
        replacement: null,
      });
      return [];
    }
    return [{ pointer: itemPointer, value: item as ObjectValue }];
  });
}

function allocate(
  kind: string,
  list: Entry[],
  key: string,
  identities: IdentityMapping[],
) {
  const mappings = allocateLegacyIdentities(
    kind,
    list.map(({ pointer, value }) => ({ pointer, original: value[key] })),
  );
  identities.push(...mappings);
  return mappings.map(({ id }) => id);
}

function loadKind(value: unknown, pointer: string, repairs: Repair[]) {
  if (
    value === "BARBELL" ||
    value === "WEIGHT_PAIR" ||
    value === "SINGLE_WEIGHT"
  )
    return value;
  repairs.push({
    pointer,
    reason: "invalid-load-kind",
    original: value,
    replacement: null,
  });
  return null;
}

function muscles(value: unknown, pointer: string, repairs: Repair[]): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    repairs.push({
      pointer,
      reason: "invalid-muscles",
      original: value,
      replacement: [],
    });
    return [];
  }
  const normalized = normalizeMuscleGroups(value);
  if (JSON.stringify(value) !== JSON.stringify(normalized)) {
    repairs.push({
      pointer,
      reason: "normalized-muscles",
      original: value,
      replacement: normalized,
    });
  }
  return normalized;
}

function presetMuscles(
  value: unknown,
  pointer: string,
  repairs: Repair[],
): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    repairs.push({
      pointer,
      reason: "invalid-muscles",
      original: value,
      replacement: [],
    });
    return [];
  }
  return value.flatMap((item: unknown, index: number) => {
    if (typeof item === "string" && item.trim()) return [item];
    repairs.push({
      pointer: `${pointer}/${index}`,
      reason: "invalid-muscle",
      original: item,
      replacement: null,
    });
    return [];
  });
}

/** Convert settings before history so activity references can be resolved. */
export function convertSettings(
  workout: LegacyEnvelope | null,
  presets: LegacyEnvelope | null,
): ConvertedSettings {
  const result: ConvertedSettings = {
    barbells: [],
    plates: [],
    exercises: [],
    presets: [],
    muscles: [],
    catalog: [],
    exerciseMuscles: [],
    presetMuscles: [],
    exerciseIds: new Map(),
    identities: [],
    repairs: [],
  };
  const { repairs, identities } = result;
  const state = workout?.state ?? {};
  const equipment = state.equipment ?? createDefaultEquipment();
  if (typeof equipment !== "object" || Array.isArray(equipment))
    throw new Error("Legacy equipment is invalid.");
  const inventory = equipment as ObjectValue;
  const barbellEntries = entries(
    inventory.barbells,
    "/equipment/barbells",
    repairs,
  );
  const barbellIds = allocate(
    "barbell",
    barbellEntries,
    "barbellId",
    identities,
  );
  const barbellReferences = new Map<string, string>();
  barbellEntries.forEach((item, index) => {
    const id = barbellIds[index];
    if (!id) throw new Error("Barbell identity allocation failed.");
    const value = repairNumber(
      item.value.value,
      `${item.pointer}/value`,
      repairs,
    );
    const unit = item.value.unit;
    if (value === null || (unit !== "lbs" && unit !== "kg")) {
      repairs.push({
        pointer: item.pointer,
        reason: "invalid-inventory",
        original: item.value,
        replacement: null,
      });
      return;
    }
    result.barbells.push({ id, position: result.barbells.length, value, unit });
    if (
      typeof item.value.barbellId === "string" &&
      !barbellReferences.has(item.value.barbellId)
    )
      barbellReferences.set(item.value.barbellId, id);
  });
  const plateEntries = entries(inventory.plates, "/equipment/plates", repairs);
  const plateIds = allocate("plate", plateEntries, "plateId", identities);
  plateEntries.forEach((item, index) => {
    const id = plateIds[index];
    if (!id) throw new Error("Plate identity allocation failed.");
    const value = repairNumber(
      item.value.value,
      `${item.pointer}/value`,
      repairs,
    );
    const quantity = repairNumber(
      item.value.quantity,
      `${item.pointer}/quantity`,
      repairs,
    );
    const unit = item.value.unit;
    if (
      value === null ||
      quantity === null ||
      (unit !== "lbs" && unit !== "kg")
    ) {
      repairs.push({
        pointer: item.pointer,
        reason: "invalid-inventory",
        original: item.value,
        replacement: null,
      });
      return;
    }
    result.plates.push({
      id,
      position: result.plates.length,
      value,
      unit,
      quantity,
    });
  });

  const labelIds = new Map<string, number>();
  function labelId(label: string) {
    const existing = labelIds.get(label);
    if (existing !== undefined) return existing;
    const id = labelIds.size + 1;
    labelIds.set(label, id);
    result.muscles.push({
      id,
      name: label,
      normalized_name: label.toLocaleLowerCase(),
    });
    return id;
  }

  const exerciseEntries = entries(state.exercises, "/exercises", repairs);
  const exerciseIds = allocate(
    "exercise",
    exerciseEntries,
    "exerciseId",
    identities,
  );
  const usedNames = new Set<string>();
  const reservedNames = new Set(
    exerciseEntries.flatMap(({ value }) =>
      typeof value.name === "string" && value.name.trim() && !value.deleted
        ? [normalizeExerciseName(value.name)]
        : [],
    ),
  );
  const exerciseLabels: string[] = [];
  const defaultPresetMuscles = new Map(
    createDefaultExercises().map((exercise) => [
      normalizeExerciseName(exercise.name),
      exercise.primaryMuscles,
    ]),
  );
  exerciseEntries.forEach((item, index) => {
    const id = exerciseIds[index];
    if (!id) throw new Error("Exercise identity allocation failed.");
    if (
      typeof item.value.exerciseId === "string" &&
      !result.exerciseIds.has(item.value.exerciseId)
    )
      result.exerciseIds.set(item.value.exerciseId, id);
    const hasValidName =
      typeof item.value.name === "string" && Boolean(item.value.name.trim());
    let exerciseName =
      typeof item.value.name === "string" && hasValidName
        ? item.value.name
        : `Recovered exercise ${id}`;
    if (exerciseName !== item.value.name)
      repairs.push({
        pointer: `${item.pointer}/name`,
        reason: "invalid-name",
        original: item.value.name,
        replacement: exerciseName,
      });
    const deleted = Boolean(item.value.deleted);
    let normalizedName = normalizeExerciseName(exerciseName);
    if (
      !deleted &&
      (usedNames.has(normalizedName) ||
        (!hasValidName && reservedNames.has(normalizedName)))
    ) {
      const original = exerciseName;
      let suffix = 0;
      do {
        exerciseName = `${original} (${id}${suffix ? `-${suffix}` : ""})`;
        normalizedName = normalizeExerciseName(exerciseName);
        suffix++;
      } while (
        reservedNames.has(normalizedName) ||
        usedNames.has(normalizedName)
      );
      repairs.push({
        pointer: `${item.pointer}/name`,
        reason: "duplicate-exercise-name",
        original,
        replacement: exerciseName,
      });
    }
    if (!deleted) usedNames.add(normalizedName);
    if (item.value.deleted != null && typeof item.value.deleted !== "boolean") {
      repairs.push({
        pointer: `${item.pointer}/deleted`,
        reason: "invalid-deleted-flag",
        original: item.value.deleted,
        replacement: deleted,
      });
    }
    if (item.value.notes != null && typeof item.value.notes !== "string") {
      repairs.push({
        pointer: `${item.pointer}/notes`,
        reason: "invalid-notes",
        original: item.value.notes,
        replacement: null,
      });
    }
    const barbell = item.value.barbellId;
    const barbellId =
      typeof barbell === "string"
        ? (barbellReferences.get(barbell) ?? null)
        : null;
    if (barbell != null && barbellId === null)
      repairs.push({
        pointer: `${item.pointer}/barbellId`,
        reason: "missing-barbell-reference",
        original: barbell,
        replacement: null,
      });
    const max = item.value.oneRepMax;
    const maxObject =
      typeof max === "object" && max !== null && !Array.isArray(max)
        ? (max as ObjectValue)
        : null;
    const maxValue = maxObject
      ? repairNumber(
          maxObject.value,
          `${item.pointer}/oneRepMax/value`,
          repairs,
        )
      : null;
    const maxUnit =
      maxObject?.unit === "lbs" || maxObject?.unit === "kg"
        ? maxObject.unit
        : null;
    if (max != null && (maxValue === null || maxUnit === null))
      repairs.push({
        pointer: `${item.pointer}/oneRepMax`,
        reason: "invalid-weight",
        original: max,
        replacement: null,
      });
    const sourceMuscles =
      item.value.primaryMuscles ??
      (item.value.primaryMuscle == null ? [] : [item.value.primaryMuscle]);
    let labels = muscles(
      sourceMuscles,
      `${item.pointer}/primaryMuscles`,
      repairs,
    );
    if (
      workout?.version !== undefined &&
      workout.version < 1 &&
      item.value.primaryMuscles === undefined &&
      labels.length === 0
    )
      labels =
        defaultPresetMuscles.get(normalizeExerciseName(exerciseName)) ?? labels;
    exerciseLabels.push(...labels);
    labels.forEach((label, position) =>
      result.exerciseMuscles.push({
        exercise_id: id,
        position,
        muscle_id: labelId(label),
      }),
    );
    result.exercises.push({
      id,
      name: exerciseName,
      normalized_name: normalizedName,
      position: index,
      load_kind: loadKind(
        item.value.loadKind,
        `${item.pointer}/loadKind`,
        repairs,
      ),
      barbell_id: barbellId,
      one_rep_max_value: maxUnit === null ? null : maxValue,
      one_rep_max_unit: maxValue === null ? null : maxUnit,
      notes: typeof item.value.notes === "string" ? item.value.notes : null,
      deleted: Number(deleted),
    });
  });

  const presetSource =
    presets === null || (presets.version !== undefined && presets.version < 2)
      ? createDefaultExercises()
      : (presets.state.exercises ?? createDefaultExercises());
  const presetEntries = entries(presetSource, "/presets", repairs);
  const presetIds = allocate("preset", presetEntries, "id", identities);
  presetEntries.forEach((item, index) => {
    const id = presetIds[index];
    if (!id) throw new Error("Preset identity allocation failed.");
    const presetName =
      typeof item.value.name === "string" && item.value.name.trim()
        ? item.value.name
        : `Recovered preset ${id}`;
    if (presetName !== item.value.name)
      repairs.push({
        pointer: `${item.pointer}/name`,
        reason: "invalid-name",
        original: item.value.name,
        replacement: presetName,
      });
    result.presets.push({
      id,
      name: presetName,
      position: index,
      load_kind: loadKind(
        item.value.loadKind,
        `${item.pointer}/loadKind`,
        repairs,
      ),
    });
    presetMuscles(
      item.value.primaryMuscles,
      `${item.pointer}/primaryMuscles`,
      repairs,
    ).forEach((label, position) =>
      result.presetMuscles.push({
        preset_id: id,
        position,
        muscle_id: labelId(label),
      }),
    );
  });
  const rawCatalog = state.muscleGroups ?? createDefaultMuscleGroups();
  const catalog = muscles(rawCatalog, "/muscleGroups", repairs);
  normalizeMuscleGroups([...catalog, ...exerciseLabels])
    .sort((a, b) => a.localeCompare(b))
    .forEach((label, position) =>
      result.catalog.push({ position, muscle_id: labelId(label) }),
    );
  return result;
}
