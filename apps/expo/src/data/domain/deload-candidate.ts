import type { Activity, Exercise, Session } from "@activity-log/ui/utils";
import { isDeloadCandidate } from "@activity-log/ui/utils";

import type { DeloadCandidateFacts } from "../repositories/deload-candidate";
import type { SessionDetail, SessionSet } from "../repositories/session-detail";

/** Unknown required facts produce an explicit unknown candidate, never invented measurements. */
export function calculateDeloadCandidate(facts: DeloadCandidateFacts): {
  candidate: boolean | null;
  partial: boolean;
} {
  if (!facts.previous) return { candidate: false, partial: false };
  const byId = new Map(facts.exercises.map((item) => [item.id, item]));
  const incomplete = [facts.current, facts.previous].some((session) =>
    session.activities.some((activity) => {
      if (
        !activity.exerciseId ||
        activity.reps === null ||
        activity.loadType === null ||
        activity.loadValue === null
      )
        return true;
      const exercise = byId.get(activity.exerciseId);
      if (exercise?.loadKind == null) return true;
      if (
        activity.loadType === "PERCENT" &&
        exercise.maxValue === null &&
        activity.mainSets.length
      )
        return true;
      // A set without a weight carries no added load (e.g. bodyweight work)
      // and counts as zero volume, as it always has.
      return activity.mainSets.some(
        (set) => set.status === "Done" && set.actualReps === null,
      );
    }),
  );
  if (incomplete) return { candidate: null, partial: true };
  const toSet = (set: SessionSet) => ({
    workoutSetId: set.id,
    type: set.kind,
    status: set.status,
    feedback: set.feedback,
    actualReps: set.actualReps ?? undefined,
    weight:
      set.weightValue !== null && set.weightUnit !== null
        ? { value: set.weightValue, unit: set.weightUnit }
        : undefined,
    start: set.startMs === null ? undefined : new Date(set.startMs),
    end: set.endMs === null ? undefined : new Date(set.endMs),
  });
  const toSession = (session: SessionDetail): Session => ({
    sessionId: session.id,
    name: session.name,
    templateId: session.lineageId ?? undefined,
    deload: session.deload,
    status: session.status,
    start: session.startMs === null ? undefined : new Date(session.startMs),
    end: session.endMs === null ? undefined : new Date(session.endMs),
    activities: session.activities.map((activity): Activity => {
      if (
        activity.exerciseId === null ||
        activity.reps === null ||
        activity.loadType === null ||
        activity.loadValue === null
      )
        throw new Error("Incomplete deload facts.");
      return {
        activityId: activity.id,
        exerciseId: activity.exerciseId,
        reps: activity.reps,
        rest: activity.restMinutes ?? 0,
        load: { type: activity.loadType, value: activity.loadValue },
        warmupSets: activity.warmupSets.map((set) => ({
          ...toSet(set),
          type: "Warmup",
        })),
        mainSets: activity.mainSets.map((set) => ({
          ...toSet(set),
          type: "Main",
        })),
      };
    }),
  });
  const exercises: Exercise[] = facts.exercises.map((exercise) => {
    if (exercise.loadKind === null) throw new Error("Incomplete deload facts.");
    return {
      exerciseId: exercise.id,
      name: exercise.name,
      loadKind: exercise.loadKind,
      oneRepMax:
        exercise.maxValue !== null && exercise.maxUnit !== null
          ? { value: exercise.maxValue, unit: exercise.maxUnit }
          : undefined,
    };
  });
  const previous = toSession(facts.previous);
  const current = toSession(facts.current);
  return {
    candidate: isDeloadCandidate([previous, current], current, exercises),
    partial: false,
  };
}
