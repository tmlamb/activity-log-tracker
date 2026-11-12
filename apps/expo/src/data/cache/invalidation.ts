import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { workoutKeys } from "./keys";

export type WorkoutChange =
  | { type: "program-list"; generation: number }
  | { type: "program-name"; generation: number; programId: string }
  | { type: "exercise-notes"; generation: number; exerciseId: string }
  | {
      type: "set-recording";
      generation: number;
      programId: string;
      sessionId: string;
      kind: "Warmup" | "Main";
    }
  | {
      type: "session-lifecycle";
      generation: number;
      programId: string;
      sessionId: string;
    };

/** Prefixes represent only projections affected by the committed change. */
export function affectedQueryKeys(change: WorkoutChange): QueryKey[] {
  const { generation } = change;
  switch (change.type) {
    case "program-list":
      return [workoutKeys.programs(generation)];
    case "program-name":
      return [
        workoutKeys.programs(generation),
        workoutKeys.programHeader(generation, change.programId),
      ];
    case "exercise-notes":
      return [workoutKeys.exerciseNotes(generation, change.exerciseId)];
    case "set-recording":
      return [
        workoutKeys.sessionDetail(
          generation,
          change.programId,
          change.sessionId,
        ),
        workoutKeys.setContexts(generation, change.programId, change.sessionId),
        workoutKeys.exerciseSeries(generation, change.programId),
        ...(change.kind === "Main"
          ? [workoutKeys.programInsights(generation, change.programId)]
          : []),
      ];
    case "session-lifecycle":
      return [
        workoutKeys.session(generation, change.programId, change.sessionId),
        workoutKeys.timeline(generation, change.programId),
        workoutKeys.programInsights(generation, change.programId),
        workoutKeys.exerciseSeries(generation, change.programId),
      ];
  }
}

/**
 * Publish only after commit. Cancel obsolete reads before refetching; callers do
 * not have to wait for unrelated observed analytics to recompute.
 */
export async function invalidateWorkoutChange(
  client: QueryClient,
  change: WorkoutChange,
) {
  const keys = affectedQueryKeys(change);
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
  await Promise.all(
    keys.map((queryKey) =>
      client.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  );
}
