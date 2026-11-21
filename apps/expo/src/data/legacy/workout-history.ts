import { z } from "zod";

import { withIds } from "./identity";
import { instant, list, measurement, number, text, weight } from "./scalars";

type Row = Record<string, string | number | null>;

const status = z
  .enum(["Planned", "Ready", "Done", "Incomplete"])
  .catch("Incomplete");
const workoutSet = z.object({
  workoutSetId: text,
  status,
  feedback: z.enum(["Easy", "Neutral", "Hard"]).catch("Neutral"),
  actualReps: number,
  weight,
  start: instant,
  end: instant,
});
const activity = z.object({
  activityId: text,
  exerciseId: text,
  reps: number,
  load: z
    .object({ type: z.enum(["PERCENT", "RPE"]), value: measurement })
    .nullable()
    .catch(null),
  rest: number,
  mainSets: list(workoutSet),
  warmupSets: list(workoutSet),
});
const session = z.object({
  sessionId: text,
  templateId: text,
  name: text,
  status,
  deload: z.boolean().catch(false),
  start: instant,
  end: instant,
  lastActivityAt: instant,
  activities: list(activity),
});
const programs = list(
  z.object({ programId: text, name: text, sessions: list(session) }),
);

export interface ConvertedHistory {
  programs: Row[];
  lineages: Row[];
  sessions: Row[];
  activities: Row[];
  sets: Row[];
}

/**
 * Convert programs and their sessions, activities and sets. `exerciseIds`
 * maps legacy exercise IDs to the converted ones; unknown exercises become null.
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
  };
  const programList = programs.parse(input);
  for (const [position, { id: programId, item: program }] of withIds(
    "program",
    programList,
    (item) => item.programId,
  ).entries()) {
    result.programs.push({
      id: programId,
      name: program.name ?? `Recovered program ${programId}`,
      position,
    });
    const lineages = new Set<string>();
    for (const [position, { id: sessionId, item: session }] of withIds(
      "session",
      program.sessions,
      (item) => item.sessionId,
    ).entries()) {
      // Sessions created from the same template share a lineage.
      const lineageId = session.templateId;
      if (lineageId !== null && !lineages.has(lineageId)) {
        lineages.add(lineageId);
        result.lineages.push({ program_id: programId, id: lineageId });
      }
      result.sessions.push({
        program_id: programId,
        id: sessionId,
        lineage_id: lineageId,
        name: session.name ?? `Recovered session ${sessionId}`,
        position,
        status: session.status,
        deload: Number(session.deload),
        start_ms: session.start,
        end_ms: session.end,
        last_activity_at_ms: session.lastActivityAt,
      });
      for (const [position, { id: activityId, item: activity }] of withIds(
        "activity",
        session.activities,
        (item) => item.activityId,
      ).entries()) {
        result.activities.push({
          program_id: programId,
          session_id: sessionId,
          id: activityId,
          parent_activity_id: null,
          superset_activity_id: null,
          exercise_id:
            activity.exerciseId === null
              ? null
              : (exerciseIds.get(activity.exerciseId) ?? null),
          position,
          reps: activity.reps,
          load_type: activity.load?.type ?? null,
          load_value: activity.load?.value ?? null,
          rest_minutes: activity.rest,
          drop_percent: null,
        });
        // Main sets come first so they keep their IDs if a warmup repeats one.
        const sets = [
          ...activity.mainSets.map((set, position) => ({
            set,
            position,
            kind: "Main",
          })),
          ...activity.warmupSets.map((set, position) => ({
            set,
            position,
            kind: "Warmup",
          })),
        ];
        for (const { id, item } of withIds(
          "set",
          sets,
          ({ set }) => set.workoutSetId,
        )) {
          const { set, kind, position } = item;
          result.sets.push({
            program_id: programId,
            session_id: sessionId,
            activity_id: activityId,
            id,
            kind,
            position,
            status: set.status,
            feedback: set.feedback,
            actual_reps: set.actualReps,
            weight_value: set.weight?.value ?? null,
            weight_unit: set.weight?.unit ?? null,
            start_ms: set.start,
            end_ms: set.end,
          });
        }
      }
    }
  }
  return result;
}
