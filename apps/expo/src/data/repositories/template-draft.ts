import type {
  SessionActivityFields,
  SessionDetail,
  SessionSet,
} from "./session-detail";
import type {
  DraftAlternative,
  DraftSet,
  SessionDraft,
} from "./session-drafts";

function plannedReps(activity: SessionActivityFields): number | null {
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

/**
 * The exercise row to plan as main: the one in `usage` with the highest count,
 * keeping the current main on ties. The rest stay alternatives, with the former
 * main taking the promoted row's place.
 */
function pickMain<T extends { exerciseId: string | null }>(
  main: T,
  alternatives: readonly T[],
  usage: ReadonlyMap<string, number>,
): { main: T; alternatives: T[] } {
  const count = (row: T) =>
    row.exerciseId === null ? 0 : (usage.get(row.exerciseId) ?? 0);
  let best = -1;
  for (const [index, row] of alternatives.entries())
    if (count(row) > count(alternatives[best] ?? main)) best = index;
  const promoted = alternatives[best];
  if (!promoted) return { main, alternatives: [...alternatives] };
  return {
    main: promoted,
    alternatives: alternatives.map((row, index) =>
      index === best ? main : row,
    ),
  };
}

/**
 * Clone just the selected source session; never carry recorded state forward.
 * `usage` counts recent main use per exercise (see getRecentMainUsage).
 */
export function createTemplateDraft(
  source: SessionDetail,
  createId: () => string,
  usage: ReadonlyMap<string, number> = new Map(),
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
  function cloneRow(activity: SessionActivityFields): DraftAlternative {
    return {
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
    };
  }
  return {
    name: source.name,
    deload: false,
    startMs: null,
    endMs: null,
    activities: source.activities.map((activity) => {
      const picked = pickMain<SessionActivityFields>(
        activity,
        activity.alternatives,
        usage,
      );
      return {
        ...cloneRow(picked.main),
        alternatives: picked.alternatives.map(cloneRow),
      };
    }),
  };
}
