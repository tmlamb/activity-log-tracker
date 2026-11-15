import { z } from "zod";

import {
  normalizeExerciseName,
  normalizeMuscleGroups,
} from "@activity-log/ui/utils";

import type { LegacyEnvelope } from "./envelope";
import {
  createDefaultExercises,
  createDefaultMuscleGroups,
} from "./exercise-defaults";
import { withIds } from "./identity";
import { list, loadKind, measurement, text, unit, weight } from "./scalars";
import { createDefaultEquipment } from "./workout-defaults";

type Row = Record<string, string | number | null>;

const barbell = z.object({ barbellId: text, value: measurement, unit });
const plate = z.object({
  plateId: text,
  value: measurement,
  unit,
  quantity: measurement,
});
const exercise = z.object({
  exerciseId: text,
  name: text,
  loadKind,
  barbellId: text,
  oneRepMax: weight,
  notes: z.string().nullable().catch(null),
  deleted: z.coerce.boolean(),
  primaryMuscles: z.array(z.unknown()).nullish().catch([]),
  /** Stores before muscle lists held a single muscle. */
  primaryMuscle: z.unknown(),
});
const workoutState = z.object({
  equipment: z
    .object({ barbells: list(barbell), plates: list(plate) })
    .prefault(createDefaultEquipment),
  exercises: list(exercise),
  muscleGroups: z
    .array(z.unknown())
    .prefault(createDefaultMuscleGroups)
    .catch([]),
});
const preset = z.object({
  id: text,
  name: text,
  loadKind,
  primaryMuscles: z
    .array(z.unknown())
    .catch([])
    .transform((values) =>
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
});
const presetState = z.object({
  exercises: list(preset).prefault(createDefaultExercises),
});

export interface ConvertedSettings {
  barbells: Row[];
  plates: Row[];
  exercises: Row[];
  presets: Row[];
  muscles: Row[];
  catalog: Row[];
  exerciseMuscles: Row[];
  presetMuscles: Row[];
}

/**
 * Convert equipment, exercises, presets and muscles. Also returns how legacy
 * exercise IDs map to the new ones, so history can point at the right exercise.
 */
export function convertSettings(
  workout: LegacyEnvelope | null,
  presetStore: LegacyEnvelope | null,
) {
  const state = workoutState.parse(workout?.state ?? {});
  const settings: ConvertedSettings = {
    barbells: [],
    plates: [],
    exercises: [],
    presets: [],
    muscles: [],
    catalog: [],
    exerciseMuscles: [],
    presetMuscles: [],
  };

  const muscleIds = new Map<string, number>();
  function muscleId(name: string) {
    let id = muscleIds.get(name);
    if (id === undefined) {
      id = muscleIds.size + 1;
      muscleIds.set(name, id);
      settings.muscles.push({
        id,
        name,
        normalized_name: name.toLocaleLowerCase(),
      });
    }
    return id;
  }

  const { barbells, plates } = state.equipment;
  const barbellIds = new Map<string, string>();
  withIds("barbell", barbells, (item) => item.barbellId).forEach(
    ({ id, item: { barbellId, value, unit } }, position) => {
      if (barbellId !== null && !barbellIds.has(barbellId))
        barbellIds.set(barbellId, id);
      settings.barbells.push({ id, position, value, unit });
    },
  );
  withIds("plate", plates, (item) => item.plateId).forEach(
    ({ id, item: { value, unit, quantity } }, position) =>
      settings.plates.push({ id, position, value, unit, quantity }),
  );

  // Active exercise names must be unique (ignoring case and spaces).
  const takenNames = new Set(
    state.exercises.flatMap(({ name, deleted }) =>
      name !== null && !deleted ? [normalizeExerciseName(name)] : [],
    ),
  );
  const usedNames = new Set<string>();
  const presetMusclesByName = new Map(
    createDefaultExercises().map((item) => [
      normalizeExerciseName(item.name),
      item.primaryMuscles,
    ]),
  );
  const exerciseIds = new Map<string, string>();
  const exerciseMuscleNames: string[] = [];
  withIds("exercise", state.exercises, (item) => item.exerciseId).forEach(
    ({ id, item }, position) => {
      if (item.exerciseId !== null && !exerciseIds.has(item.exerciseId))
        exerciseIds.set(item.exerciseId, id);

      let name = item.name ?? `Recovered exercise ${id}`;
      if (!item.deleted && usedNames.has(normalizeExerciseName(name))) {
        const base = name;
        for (let copy = 2; ; copy++) {
          name = `${base} (${copy})`;
          const normalized = normalizeExerciseName(name);
          if (!takenNames.has(normalized) && !usedNames.has(normalized)) break;
        }
      }
      if (!item.deleted) usedNames.add(normalizeExerciseName(name));

      let muscles = normalizeMuscleGroups(
        item.primaryMuscles ??
          (item.primaryMuscle == null ? [] : [item.primaryMuscle]),
      );
      // Version 0 stores had no muscles; borrow them from the matching preset.
      if (
        workout?.version !== undefined &&
        workout.version < 1 &&
        item.primaryMuscles === undefined &&
        muscles.length === 0
      )
        muscles = presetMusclesByName.get(normalizeExerciseName(name)) ?? [];
      exerciseMuscleNames.push(...muscles);
      muscles.forEach((muscle, index) =>
        settings.exerciseMuscles.push({
          exercise_id: id,
          position: index,
          muscle_id: muscleId(muscle),
        }),
      );

      settings.exercises.push({
        id,
        name,
        normalized_name: normalizeExerciseName(name),
        position,
        load_kind: item.loadKind,
        barbell_id:
          item.barbellId === null
            ? null
            : (barbellIds.get(item.barbellId) ?? null),
        one_rep_max_value: item.oneRepMax?.value ?? null,
        one_rep_max_unit: item.oneRepMax?.unit ?? null,
        notes: item.notes,
        deleted: Number(item.deleted),
      });
    },
  );

  // Preset stores before version 2 predate custom presets; use the defaults.
  const presets =
    presetStore === null ||
    (presetStore.version !== undefined && presetStore.version < 2)
      ? presetState.parse({}).exercises
      : presetState.parse(presetStore.state).exercises;
  withIds("preset", presets, (item) => item.id).forEach(
    ({ id, item }, position) => {
      settings.presets.push({
        id,
        name: item.name ?? `Recovered preset ${id}`,
        position,
        load_kind: item.loadKind,
      });
      item.primaryMuscles.forEach((muscle, index) =>
        settings.presetMuscles.push({
          preset_id: id,
          position: index,
          muscle_id: muscleId(muscle),
        }),
      );
    },
  );

  normalizeMuscleGroups([...state.muscleGroups, ...exerciseMuscleNames])
    .sort((a, b) => a.localeCompare(b))
    .forEach((muscle, position) =>
      settings.catalog.push({ position, muscle_id: muscleId(muscle) }),
    );

  return { settings, exerciseIds };
}
