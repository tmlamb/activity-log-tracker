import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

import type {
  ProgramWeekPage,
  TimelineCursor,
} from "../domain/program-timeline";
import { workoutKeys } from "./keys";

export type WorkoutChange =
  | { type: "program-list"; generation: number }
  | { type: "muscle-catalog"; generation: number }
  | { type: "program-name"; generation: number; programId: string }
  | { type: "exercise-notes"; generation: number; exerciseId: string }
  | {
      type: "exercise-metadata";
      generation: number;
      exerciseId: string;
      affectedPrograms: string[];
    }
  | {
      type: "equipment";
      generation: number;
      affectedExercises: string[];
      affectedPrograms: string[];
    }
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
    }
  | {
      type: "session-structure";
      generation: number;
      programId: string;
      sessionId: string;
      affectsOtherSessions: boolean;
      added: boolean;
    };

/** Prefixes represent only projections affected by the committed change. */
export function affectedQueryKeys(change: WorkoutChange): QueryKey[] {
  const { generation } = change;
  switch (change.type) {
    case "program-list":
      return [workoutKeys.programs(generation)];
    case "muscle-catalog":
      return [workoutKeys.muscles(generation)];
    case "program-name":
      return [
        workoutKeys.programs(generation),
        workoutKeys.programHeader(generation, change.programId),
        workoutKeys.sessionEditorSeeds(generation, change.programId),
      ];
    case "exercise-notes":
      return [
        workoutKeys.exerciseNotes(generation, change.exerciseId),
        workoutKeys.exerciseDetail(generation, change.exerciseId),
      ];
    case "exercise-metadata":
      return [
        workoutKeys.exerciseCatalog(generation),
        workoutKeys.exercise(generation, change.exerciseId),
        ...change.affectedPrograms.flatMap((programId) => [
          workoutKeys.sessions(generation, programId),
          workoutKeys.sessionEditorSeeds(generation, programId),
          workoutKeys.deloadCandidates(generation, programId),
          workoutKeys.templates(generation, programId),
          workoutKeys.programInsights(generation, programId),
          workoutKeys.exerciseSeries(generation, programId),
        ]),
      ];
    case "equipment":
      return [
        workoutKeys.equipment(generation),
        ...change.affectedExercises.map((id) =>
          workoutKeys.exercise(generation, id),
        ),
        ...change.affectedPrograms.flatMap((id) => [
          workoutKeys.sessions(generation, id),
          workoutKeys.sessionEditorSeeds(generation, id),
        ]),
      ];
    case "set-recording":
      return [
        workoutKeys.sessionDetail(
          generation,
          change.programId,
          change.sessionId,
        ),
        workoutKeys.setContexts(generation, change.programId, change.sessionId),
        workoutKeys.sessionEditorSeed(
          generation,
          change.programId,
          change.sessionId,
        ),
        workoutKeys.exerciseSeries(generation, change.programId),
        ...(change.kind === "Main"
          ? [
              workoutKeys.programInsights(generation, change.programId),
              workoutKeys.deloadCandidates(generation, change.programId),
            ]
          : []),
      ];
    case "session-lifecycle":
      return [
        workoutKeys.session(generation, change.programId, change.sessionId),
        workoutKeys.sessionPolicies(generation, change.programId),
        workoutKeys.deloadCandidates(generation, change.programId),
        workoutKeys.sessionEditorSeeds(generation, change.programId),
        workoutKeys.timeline(generation, change.programId),
        workoutKeys.programInsights(generation, change.programId),
        workoutKeys.exerciseSeries(generation, change.programId),
        workoutKeys.templates(generation, change.programId),
      ];
    case "session-structure":
      return [
        workoutKeys.sessionPolicies(generation, change.programId),
        workoutKeys.deloadCandidates(generation, change.programId),
        workoutKeys.sessionEditorSeeds(generation, change.programId),
        change.affectsOtherSessions
          ? workoutKeys.sessions(generation, change.programId)
          : workoutKeys.session(generation, change.programId, change.sessionId),
        workoutKeys.timeline(generation, change.programId),
        workoutKeys.programInsights(generation, change.programId),
        workoutKeys.exerciseSeries(generation, change.programId),
        workoutKeys.templates(generation, change.programId),
        ...(change.added ? [workoutKeys.programs(generation)] : []),
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
  if (
    change.type === "session-lifecycle" ||
    change.type === "session-structure"
  ) {
    // Discard later cursors, but retain a known first page as a placeholder while
    // it refetches. A window whose first page was evicted must start over.
    client
      .getQueryCache()
      .findAll({
        queryKey: workoutKeys.programWeeks(change.generation, change.programId),
      })
      .forEach((query) => {
        const data = query.state.data as
          | InfiniteData<ProgramWeekPage, TimelineCursor | undefined>
          | undefined;
        if (data?.pages[0] && data.pageParams[0] === undefined) {
          client.setQueryData(query.queryKey, {
            pages: [data.pages[0]],
            pageParams: [undefined],
          });
        } else query.reset();
      });
  }
  await Promise.all(
    keys.map((queryKey) =>
      client.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  );
}
