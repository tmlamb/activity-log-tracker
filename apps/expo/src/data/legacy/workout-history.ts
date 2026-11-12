import type { IdentityMapping } from "./identity";
import type { Repair } from "./scalars";
import { allocateLegacyIdentities } from "./identity";
import { repairDate, repairEnum, repairNumber } from "./scalars";

type Value = string | number | null;
type Row = Record<string, Value>;
type LegacyRecord = Record<string, unknown>;
interface Entry {
  pointer: string;
  value: LegacyRecord;
}

export interface ConvertedHistory {
  programs: Row[];
  lineages: Row[];
  sessions: Row[];
  activities: Row[];
  sets: Row[];
  identities: IdentityMapping[];
  repairs: Repair[];
}

const statuses = ["Planned", "Ready", "Done", "Incomplete"] as const;
const feedbackValues = ["Easy", "Neutral", "Hard"] as const;

function records(value: unknown, pointer: string, repairs: Repair[]): Entry[] {
  if (value === null || value === undefined) {
    repairs.push({
      pointer,
      reason: "missing-collection",
      original: value,
      replacement: [],
    });
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Legacy collection ${pointer} is not an array.`);
  }
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
    return [{ pointer: itemPointer, value: item as LegacyRecord }];
  });
}

function allocate(
  kind: string,
  entries: readonly Entry[],
  key: string,
  identities: IdentityMapping[],
) {
  const mappings = allocateLegacyIdentities(
    kind,
    entries.map(({ pointer, value }) => ({ pointer, original: value[key] })),
  );
  identities.push(...mappings);
  return mappings.map(({ id }) => id);
}

function name(
  value: unknown,
  fallback: string,
  pointer: string,
  repairs: Repair[],
) {
  if (typeof value === "string" && value.trim()) return value;
  repairs.push({
    pointer,
    reason: "invalid-name",
    original: value,
    replacement: fallback,
  });
  return fallback;
}

function weight(value: unknown, pointer: string, repairs: Repair[]) {
  if (value === null || value === undefined) return { value: null, unit: null };
  if (typeof value !== "object" || Array.isArray(value)) {
    repairs.push({
      pointer,
      reason: "invalid-weight",
      original: value,
      replacement: null,
    });
    return { value: null, unit: null };
  }
  const weight = value as LegacyRecord;
  const number = repairNumber(weight.value, `${pointer}/value`, repairs);
  if (number === null || (weight.unit !== "lbs" && weight.unit !== "kg")) {
    repairs.push({
      pointer,
      reason: "invalid-weight",
      original: value,
      replacement: null,
    });
    return { value: null, unit: null };
  }
  return { value: number, unit: weight.unit };
}

/**
 * Convert history after exercise IDs have been repaired. The reference map
 * resolves duplicate legacy exercise IDs according to first-match semantics.
 * This is pure: callers own persistence, archival, and readiness verification.
 */
export function convertWorkoutHistory(
  input: unknown,
  exerciseIds: ReadonlyMap<string, string>,
): ConvertedHistory {
  const result: ConvertedHistory = {
    programs: [],
    lineages: [],
    sessions: [],
    activities: [],
    sets: [],
    identities: [],
    repairs: [],
  };
  const { repairs, identities } = result;
  const programs = records(input, "/programs", repairs);
  const programIds = allocate("program", programs, "programId", identities);
  programs.forEach((program, programPosition) => {
    const programId = programIds[programPosition];
    if (!programId) throw new Error("Program identity allocation failed.");
    result.programs.push({
      id: programId,
      name: name(
        program.value.name,
        `Recovered program ${programId}`,
        `${program.pointer}/name`,
        repairs,
      ),
      position: programPosition,
    });
    const sessions = records(
      program.value.sessions,
      `${program.pointer}/sessions`,
      repairs,
    );
    const sessionIds = allocate("session", sessions, "sessionId", identities);
    const lineages = new Set<string>();
    sessions.forEach((session, sessionPosition) => {
      const sessionId = sessionIds[sessionPosition];
      if (!sessionId) throw new Error("Session identity allocation failed.");
      const sourceLineage = session.value.templateId;
      const lineageId =
        typeof sourceLineage === "string" && sourceLineage.trim()
          ? sourceLineage
          : null;
      if (sourceLineage != null && lineageId === null)
        repairs.push({
          pointer: `${session.pointer}/templateId`,
          reason: "invalid-lineage",
          original: sourceLineage,
          replacement: null,
        });
      if (lineageId !== null && !lineages.has(lineageId)) {
        lineages.add(lineageId);
        result.lineages.push({ program_id: programId, id: lineageId });
      }
      result.sessions.push({
        program_id: programId,
        id: sessionId,
        lineage_id: lineageId,
        name: name(
          session.value.name,
          `Recovered session ${sessionId}`,
          `${session.pointer}/name`,
          repairs,
        ),
        position: sessionPosition,
        status: repairEnum(
          session.value.status,
          statuses,
          "Incomplete",
          `${session.pointer}/status`,
          repairs,
        ),
        deload: Number(session.value.deload === true),
        start_ms: repairDate(
          session.value.start,
          `${session.pointer}/start`,
          repairs,
        ),
        end_ms: repairDate(
          session.value.end,
          `${session.pointer}/end`,
          repairs,
        ),
        last_activity_at_ms: repairDate(
          session.value.lastActivityAt,
          `${session.pointer}/lastActivityAt`,
          repairs,
        ),
      });
      const activities = records(
        session.value.activities,
        `${session.pointer}/activities`,
        repairs,
      );
      const activityIds = allocate(
        "activity",
        activities,
        "activityId",
        identities,
      );
      activities.forEach((activity, activityPosition) => {
        const activityId = activityIds[activityPosition];
        if (!activityId)
          throw new Error("Activity identity allocation failed.");
        const originalExercise = activity.value.exerciseId;
        const exerciseId =
          typeof originalExercise === "string"
            ? (exerciseIds.get(originalExercise) ?? null)
            : null;
        if (exerciseId === null)
          repairs.push({
            pointer: `${activity.pointer}/exerciseId`,
            reason: "missing-exercise-reference",
            original: originalExercise,
            replacement: null,
          });
        const load = activity.value.load;
        const loadObject =
          typeof load === "object" && load !== null && !Array.isArray(load)
            ? (load as LegacyRecord)
            : {};
        const loadValue = repairNumber(
          loadObject.value,
          `${activity.pointer}/load/value`,
          repairs,
        );
        const loadType =
          loadObject.type === "PERCENT" || loadObject.type === "RPE"
            ? loadObject.type
            : null;
        if (loadType === null || loadValue === null)
          repairs.push({
            pointer: `${activity.pointer}/load`,
            reason: "invalid-load",
            original: load,
            replacement: null,
          });
        result.activities.push({
          program_id: programId,
          session_id: sessionId,
          id: activityId,
          exercise_id: exerciseId,
          position: activityPosition,
          reps: repairNumber(
            activity.value.reps,
            `${activity.pointer}/reps`,
            repairs,
          ),
          load_type: loadType !== null && loadValue !== null ? loadType : null,
          load_value: loadType !== null ? loadValue : null,
          rest_minutes: repairNumber(
            activity.value.rest,
            `${activity.pointer}/rest`,
            repairs,
          ),
        });
        const main = records(
          activity.value.mainSets,
          `${activity.pointer}/mainSets`,
          repairs,
        );
        const warmup = records(
          activity.value.warmupSets,
          `${activity.pointer}/warmupSets`,
          repairs,
        );
        // Legacy set edits search main sets before warmups for duplicate IDs.
        const setEntries = [...main, ...warmup];
        const setIds = allocate("set", setEntries, "workoutSetId", identities);
        setEntries.forEach((set, index) => {
          const setId = setIds[index];
          if (!setId) throw new Error("Set identity allocation failed.");
          const kind = index < main.length ? "Main" : "Warmup";
          if (set.value.type !== kind)
            repairs.push({
              pointer: `${set.pointer}/type`,
              reason: "set-kind-mismatch",
              original: set.value.type,
              replacement: kind,
            });
          const setWeight = weight(
            set.value.weight,
            `${set.pointer}/weight`,
            repairs,
          );
          result.sets.push({
            program_id: programId,
            session_id: sessionId,
            activity_id: activityId,
            id: setId,
            kind,
            position: kind === "Main" ? index : index - main.length,
            status: repairEnum(
              set.value.status,
              statuses,
              "Incomplete",
              `${set.pointer}/status`,
              repairs,
            ),
            feedback: repairEnum(
              set.value.feedback,
              feedbackValues,
              "Neutral",
              `${set.pointer}/feedback`,
              repairs,
            ),
            actual_reps: repairNumber(
              set.value.actualReps,
              `${set.pointer}/actualReps`,
              repairs,
            ),
            weight_value: setWeight.value,
            weight_unit: setWeight.unit,
            start_ms: repairDate(
              set.value.start,
              `${set.pointer}/start`,
              repairs,
            ),
            end_ms: repairDate(set.value.end, `${set.pointer}/end`, repairs),
          });
        });
      });
    });
  });
  return result;
}
