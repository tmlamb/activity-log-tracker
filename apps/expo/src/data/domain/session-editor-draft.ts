import type { SessionDetail } from "../repositories/session-detail";
import type {
  DraftActivity,
  DraftSet,
  SessionDraft,
} from "../repositories/session-drafts";

export function draftFromSession(session: SessionDetail): SessionDraft {
  const cloneSet = ({
    kind: _kind,
    position: _position,
    ...set
  }: SessionDetail["activities"][number]["mainSets"][number]): DraftSet => ({
    ...set,
  });
  return {
    name: session.name,
    deload: session.deload,
    startMs: session.startMs,
    endMs: session.endMs,
    activities: session.activities.map(
      ({
        exerciseName: _name,
        exerciseDeleted: _deleted,
        warmupSets,
        mainSets,
        ...activity
      }) => ({
        ...activity,
        warmupSets: warmupSets.map(cloneSet),
        mainSets: mainSets.map(cloneSet),
      }),
    ),
  };
}

export function newDraftSet(
  createId: () => string,
  terminalEndMs: number | null | undefined,
): DraftSet {
  const terminal = terminalEndMs !== undefined;
  return {
    id: createId(),
    status: terminal ? "Incomplete" : "Planned",
    feedback: "Neutral",
    actualReps: 0,
    weightValue: null,
    weightUnit: null,
    startMs: terminalEndMs ?? null,
    endMs: terminalEndMs ?? null,
  };
}

export function newDraftActivity(
  createId: () => string,
  terminalEndMs: number | null | undefined,
): DraftActivity {
  return {
    id: createId(),
    exerciseId: null,
    reps: 10,
    loadType: "RPE",
    loadValue: 8,
    restMinutes: 2,
    warmupSets: Array.from({ length: 3 }, () =>
      newDraftSet(createId, terminalEndMs),
    ),
    mainSets: Array.from({ length: 3 }, () =>
      newDraftSet(createId, terminalEndMs),
    ),
  };
}

/** Shift the current draft's execution timestamps without changing durations. */
export function shiftDraftStart(
  draft: SessionDraft,
  nextStartMs: number,
): SessionDraft {
  if (draft.startMs === null) return { ...draft, startMs: nextStartMs };
  const offset = nextStartMs - draft.startMs;
  const shift = (value: number | null) =>
    value === null ? null : value + offset;
  const shiftSet = (set: DraftSet) => ({
    ...set,
    startMs: shift(set.startMs),
    endMs: shift(set.endMs),
  });
  return {
    ...draft,
    startMs: nextStartMs,
    endMs: shift(draft.endMs),
    activities: draft.activities.map((activity) => ({
      ...activity,
      warmupSets: activity.warmupSets.map(shiftSet),
      mainSets: activity.mainSets.map(shiftSet),
    })),
  };
}
