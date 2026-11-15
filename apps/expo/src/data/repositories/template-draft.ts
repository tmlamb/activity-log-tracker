import type {
  SessionActivity,
  SessionDetail,
  SessionSet,
} from "./session-detail";
import type { DraftSet, SessionDraft } from "./session-drafts";

function plannedReps(activity: SessionActivity): number | null {
  const completed = activity.mainSets.flatMap((set) =>
    set.status === "Done" && set.actualReps !== null && set.actualReps > 0
      ? [set.actualReps]
      : [],
  );
  return completed.length === 0
    ? activity.reps
    : Math.round(
        completed.reduce((total, reps) => total + reps, 0) / completed.length,
      );
}

/** Clone just the selected source session; never carry recorded state forward. */
export function createTemplateDraft(
  source: SessionDetail,
  createId: () => string,
): SessionDraft {
  function cloneSet(set: SessionSet, keepWeight: boolean): DraftSet {
    return {
      id: createId(),
      status: "Planned",
      feedback: "Neutral",
      actualReps: 0,
      weightValue: keepWeight ? set.weightValue : null,
      weightUnit: keepWeight ? set.weightUnit : null,
      startMs: null,
      endMs: null,
    };
  }
  return {
    name: source.name,
    deload: false,
    startMs: null,
    endMs: null,
    activities: source.activities.map((activity) => ({
      id: createId(),
      exerciseId: activity.exerciseId,
      reps: plannedReps(activity),
      loadType: activity.loadType,
      loadValue: activity.loadValue,
      restMinutes: activity.restMinutes,
      warmupSets: activity.warmupSets.map((set) =>
        cloneSet(set, activity.loadType === "RPE"),
      ),
      mainSets: activity.mainSets.map((set) =>
        cloneSet(set, activity.loadType === "RPE"),
      ),
    })),
  };
}
