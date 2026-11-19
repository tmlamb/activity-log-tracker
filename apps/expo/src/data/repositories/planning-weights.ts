import type { Weight } from "@activity-log/ui/utils";

import type { Db } from "../database/db";

export interface PlanningWeightActivity {
  exerciseId: string | null;
  loadType: "PERCENT" | "RPE" | null;
}
export type PlanningWeightSource = {
  kind: "session" | "template";
  sessionId: string;
} | null;
export interface PlanningWeightHint {
  activityIndex: number;
  weight: Weight | null;
}

/**
 * Match the legacy editor: current/source session first; for an edited session
 * search other lineage sessions in reverse stored order. Within a source, use
 * the last recorded weight for the same exercise occurrence and set kind.
 * Call inside one reader snapshot. Requests are batched, not loaded per row.
 */
export function getPlanningWeightHints(
  reader: Db,
  programId: string,
  source: PlanningWeightSource,
  activities: readonly PlanningWeightActivity[],
  kind: "Warmup" | "Main",
): PlanningWeightHint[] {
  const counts = new Map<string, number>();
  const requests: {
    activityIndex: number;
    exerciseId: string;
    occurrence: number;
  }[] = [];
  activities.forEach((activity, activityIndex) => {
    if (activity.exerciseId === null) return;
    const occurrence = counts.get(activity.exerciseId) ?? 0;
    counts.set(activity.exerciseId, occurrence + 1);
    if (activity.loadType === "RPE")
      requests.push({
        activityIndex,
        exerciseId: activity.exerciseId,
        occurrence,
      });
  });
  if (!requests.length) return [];
  if (!source)
    return requests.map(({ activityIndex }) => ({
      activityIndex,
      weight: null,
    }));
  const selected = reader.getFirstSync<{ lineageId: string | null }>(
    "SELECT lineage_id AS lineageId FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    source.sessionId,
  );
  if (!selected) throw new Error("The planning source no longer exists.");
  const result: PlanningWeightHint[] = [];
  // Keep well under SQLite's host-parameter limits even for unusually large drafts.
  for (let offset = 0; offset < requests.length; offset += 200) {
    const batch = requests.slice(offset, offset + 200);
    const rows = reader.getAllSync<{
      activityIndex: number;
      value: number | null;
      unit: "lbs" | "kg" | null;
    }>(
      `WITH requests(activityIndex, exerciseId, occurrence) AS (VALUES ${batch.map(() => "(?, ?, ?)").join(", ")})
       SELECT r.activityIndex, chosen.weight_value AS value, chosen.weight_unit AS unit
       FROM requests r LEFT JOIN workout_sets chosen ON chosen.rowid = COALESCE(
         (SELECT w.rowid FROM activities a CROSS JOIN workout_sets w
          WHERE a.program_id = ? AND a.session_id = ? AND a.exercise_id = r.exerciseId AND a.parent_activity_id IS NULL
            AND w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id AND w.kind = ? AND w.weight_value IS NOT NULL
            AND (SELECT COUNT(*) FROM activities prev WHERE prev.program_id = a.program_id AND prev.session_id = a.session_id AND prev.exercise_id = a.exercise_id AND prev.parent_activity_id IS NULL AND prev.position < a.position) = r.occurrence
          ORDER BY w.position DESC LIMIT 1),
         (SELECT w.rowid FROM sessions s CROSS JOIN activities a CROSS JOIN workout_sets w
          WHERE ? = 1 AND s.program_id = ? AND s.lineage_id = ? AND s.id <> ? AND a.exercise_id = r.exerciseId
            AND a.program_id = s.program_id AND a.session_id = s.id AND a.parent_activity_id IS NULL
            AND w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id AND w.kind = ? AND w.weight_value IS NOT NULL
            AND (SELECT COUNT(*) FROM activities prev WHERE prev.program_id = a.program_id AND prev.session_id = a.session_id AND prev.exercise_id = a.exercise_id AND prev.parent_activity_id IS NULL AND prev.position < a.position) = r.occurrence
          ORDER BY s.position DESC, w.position DESC LIMIT 1))
       ORDER BY r.activityIndex`,
      ...batch.flatMap(({ activityIndex, exerciseId, occurrence }) => [
        activityIndex,
        exerciseId,
        occurrence,
      ]),
      programId,
      source.sessionId,
      kind,
      Number(source.kind === "session"),
      programId,
      selected.lineageId,
      source.sessionId,
      kind,
    );
    result.push(
      ...rows.map(({ activityIndex, value, unit }) => ({
        activityIndex,
        weight: value !== null && unit !== null ? { value, unit } : null,
      })),
    );
  }
  return result;
}

/**
 * Weight hints for one main activity's alternatives. An alternative matches
 * the source's alternative with the same exercise (and occurrence among its
 * siblings) under the main activity with the same exercise occurrence as
 * `parents[parentIndex]`. The source session is searched first; for an edited
 * session, other lineage sessions follow in reverse stored order.
 */
export function getAlternativeWeightHints(
  reader: Db,
  programId: string,
  source: PlanningWeightSource,
  parents: readonly PlanningWeightActivity[],
  parentIndex: number,
  alternatives: readonly PlanningWeightActivity[],
  kind: "Warmup" | "Main",
): PlanningWeightHint[] {
  const parentExerciseId = parents[parentIndex]?.exerciseId ?? null;
  const parentOccurrence = parents
    .slice(0, parentIndex)
    .filter((parent) => parent.exerciseId === parentExerciseId).length;
  const counts = new Map<string, number>();
  const requests: {
    activityIndex: number;
    exerciseId: string;
    occurrence: number;
  }[] = [];
  alternatives.forEach((alternative, activityIndex) => {
    if (alternative.exerciseId === null) return;
    const occurrence = counts.get(alternative.exerciseId) ?? 0;
    counts.set(alternative.exerciseId, occurrence + 1);
    if (alternative.loadType === "RPE")
      requests.push({
        activityIndex,
        exerciseId: alternative.exerciseId,
        occurrence,
      });
  });
  if (!requests.length) return [];
  if (!source || parentExerciseId === null)
    return requests.map(({ activityIndex }) => ({
      activityIndex,
      weight: null,
    }));
  const selected = reader.getFirstSync<{ lineageId: string | null }>(
    "SELECT lineage_id AS lineageId FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    source.sessionId,
  );
  if (!selected) throw new Error("The planning source no longer exists.");
  // Matches parent `p` by main-activity occurrence and alternative `a` by
  // sibling occurrence, then takes the last recorded weight of `kind`.
  const match = `p.parent_activity_id IS NULL AND p.exercise_id = ?
    AND (SELECT COUNT(*) FROM activities prev WHERE prev.program_id = p.program_id AND prev.session_id = p.session_id
      AND prev.parent_activity_id IS NULL AND prev.exercise_id = p.exercise_id AND prev.position < p.position) = ?
    AND a.program_id = p.program_id AND a.session_id = p.session_id AND a.parent_activity_id = p.id AND a.exercise_id = ?
    AND (SELECT COUNT(*) FROM activities sib WHERE sib.program_id = a.program_id AND sib.session_id = a.session_id
      AND sib.parent_activity_id = a.parent_activity_id AND sib.exercise_id = a.exercise_id AND sib.position < a.position) = ?
    AND w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
    AND w.kind = ? AND w.weight_value IS NOT NULL`;
  return requests.map(({ activityIndex, exerciseId, occurrence }) => {
    const matchParameters = [
      parentExerciseId,
      parentOccurrence,
      exerciseId,
      occurrence,
      kind,
    ];
    const row =
      reader.getFirstSync<{ value: number; unit: "lbs" | "kg" }>(
        `SELECT w.weight_value AS value, w.weight_unit AS unit
         FROM activities p CROSS JOIN activities a CROSS JOIN workout_sets w
         WHERE p.program_id = ? AND p.session_id = ? AND ${match}
         ORDER BY w.position DESC LIMIT 1`,
        programId,
        source.sessionId,
        ...matchParameters,
      ) ??
      (source.kind === "session" && selected.lineageId !== null
        ? reader.getFirstSync<{ value: number; unit: "lbs" | "kg" }>(
            `SELECT w.weight_value AS value, w.weight_unit AS unit
             FROM sessions s CROSS JOIN activities p CROSS JOIN activities a CROSS JOIN workout_sets w
             WHERE s.program_id = ? AND s.lineage_id = ? AND s.id <> ?
               AND p.program_id = s.program_id AND p.session_id = s.id AND ${match}
             ORDER BY s.position DESC, w.position DESC LIMIT 1`,
            programId,
            selected.lineageId,
            source.sessionId,
            ...matchParameters,
          )
        : null);
    return { activityIndex, weight: row ? { ...row } : null };
  });
}
