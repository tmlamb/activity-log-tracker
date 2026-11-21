import type {
  SessionActivityFields,
  SessionDetail,
} from "../repositories/session-detail";
import type {
  DraftActivity,
  DraftAlternative,
  DraftSet,
  DraftSupersetMember,
  SessionDraft,
} from "../repositories/session-drafts";
import type { ExerciseSelectionInput } from "../selection-handoff";

export function draftFromSession(session: SessionDetail): SessionDraft {
  const cloneSet = ({
    kind: _kind,
    position: _position,
    ...set
  }: SessionDetail["activities"][number]["mainSets"][number]): DraftSet => ({
    ...set,
  });
  const cloneRow = ({
    exerciseName: _name,
    exerciseDeleted: _deleted,
    warmupSets,
    mainSets,
    ...activity
  }: SessionActivityFields): DraftAlternative => ({
    ...activity,
    warmupSets: warmupSets.map(cloneSet),
    mainSets: mainSets.map(cloneSet),
  });
  const cloneMain = ({
    alternatives,
    ...activity
  }: SessionDetail["activities"][number]["supersets"][number]): DraftSupersetMember => ({
    ...cloneRow(activity),
    alternatives: alternatives.map(cloneRow),
  });
  return {
    name: session.name,
    deload: session.deload,
    startMs: session.startMs,
    endMs: session.endMs,
    activities: session.activities.map(({ supersets, ...activity }) => ({
      ...cloneMain(activity),
      supersets: supersets.map(cloneMain),
    })),
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
    ...newDraftAlternative(createId, terminalEndMs),
    alternatives: [],
    supersets: [],
  };
}

/** A new superset member planned with its leader's set counts and no rest. */
export function newDraftSupersetMember(
  leader: DraftAlternative,
  createId: () => string,
  terminalEndMs: number | null | undefined,
): DraftSupersetMember {
  return {
    ...alignSupersetRow(
      newDraftAlternative(createId, terminalEndMs),
      leader,
      createId,
      terminalEndMs,
    ),
    alternatives: [],
  };
}

export function newDraftAlternative(
  createId: () => string,
  terminalEndMs: number | null | undefined,
): DraftAlternative {
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
      ...shiftMain(activity),
      supersets: activity.supersets.map(shiftMain),
    })),
  };
  function shiftMain<T extends DraftSupersetMember>(activity: T): T {
    return {
      ...shiftRow(activity),
      alternatives: activity.alternatives.map(shiftRow),
    };
  }
  function shiftRow<T extends DraftAlternative>(activity: T): T {
    return {
      ...activity,
      warmupSets: activity.warmupSets.map(shiftSet),
      mainSets: activity.mainSets.map(shiftSet),
    };
  }
}

/** Which required fields of one exercise row are missing. */
export function activityErrors(activity: DraftAlternative) {
  return {
    exercise: !activity.exerciseId,
    reps: activity.reps === null || activity.reps <= 0,
    load: activity.loadType === null || activity.loadValue === null,
    // A row needs at least one set of either kind.
    sets: activity.warmupSets.length + activity.mainSets.length === 0,
  };
}

export function isActivityValid(activity: DraftAlternative) {
  return !Object.values(activityErrors(activity)).some(Boolean);
}

export interface SelectedExercise {
  id: string;
  oneRepMax: { value: number } | null;
}

/**
 * Swap an alternative in as a main row (an activity or a superset member),
 * keeping its own plan and sets; the former main takes its place among the
 * alternatives. An activity keeps its superset members.
 */
export function swapAlternative<T extends DraftSupersetMember>(
  activity: T,
  alternativeId: string,
): T | null {
  const { alternatives, ...rest } = activity;
  const index = alternatives.findIndex((item) => item.id === alternativeId);
  const promoted = alternatives[index];
  if (!promoted) return null;
  const { supersets, ...main } = rest as Omit<T, "alternatives"> & {
    supersets?: DraftSupersetMember[];
  };
  return {
    ...promoted,
    alternatives: alternatives.map((item, i) => (i === index ? main : item)),
    ...(supersets ? { supersets } : {}),
  } as unknown as T;
}

/**
 * Plan a superset row like its leader: the same number of warmup and main sets
 * (so sets alternate one for one) and no rest between exercises.
 */
export function alignSupersetRow<T extends DraftAlternative>(
  row: T,
  leader: Pick<DraftAlternative, "warmupSets" | "mainSets">,
  createId: () => string,
  terminalEndMs: number | null | undefined,
): T {
  let next: T = row.restMinutes === 0 ? row : { ...row, restMinutes: 0 };
  for (const kind of ["Warmup", "Main"] as const) {
    const field = kind === "Warmup" ? "warmupSets" : "mainSets";
    if (next[field].length === leader[field].length) continue;
    next =
      resizeSets(
        next,
        kind,
        String(leader[field].length),
        createId,
        terminalEndMs,
      )?.activity ?? next;
  }
  return next;
}

/**
 * Keep a superset consistent after any edit: while `enabled` (by default, when
 * the activity has members) nothing in it rests, and every member and member
 * alternative has the leader's set counts.
 */
export function normalizeSuperset(
  activity: DraftActivity,
  createId: () => string,
  terminalEndMs: number | null | undefined,
  enabled = activity.supersets.length > 0,
): DraftActivity {
  if (!enabled) return activity;
  const noRest = <T extends DraftAlternative>(row: T): T =>
    row.restMinutes === 0 ? row : { ...row, restMinutes: 0 };
  const align = <T extends DraftAlternative>(row: T): T =>
    alignSupersetRow(row, activity, createId, terminalEndMs);
  return {
    ...noRest(activity),
    alternatives: activity.alternatives.map(noRest),
    supersets: activity.supersets.map((member) => ({
      ...align(member),
      alternatives: member.alternatives.map(align),
    })),
  };
}

/** Every exercise row of an activity: mains, members and all alternatives. */
export function activityRows(activity: DraftActivity): DraftAlternative[] {
  return [activity, ...activity.supersets].flatMap((main) => [
    main,
    ...main.alternatives,
  ]);
}

/**
 * What an exercise pick for one row of `activity` may offer. Each exercise is
 * used once per activity, superset members included: a main row (the leader
 * or a member) lists its own alternatives to swap in, and every row hides the
 * other exercises the activity already uses. `otherExerciseIds` adds exercises
 * used outside `activity`, as when a member is edited on its own.
 */
export function exerciseSelectionInput(
  activity: DraftSupersetMember & { supersets?: DraftSupersetMember[] },
  rowId: string,
  name: (exerciseId: string) => string,
  otherExerciseIds: readonly string[] = [],
): ExerciseSelectionInput {
  const mains = [activity, ...(activity.supersets ?? [])];
  const owner = mains.find((main) => main.id === rowId);
  const ownAlternatives = owner?.alternatives ?? [];
  const others = mains
    .flatMap((main) => [main, ...main.alternatives])
    .flatMap((row) =>
      row.id !== rowId &&
      !ownAlternatives.includes(row) &&
      row.exerciseId !== null
        ? [row.exerciseId]
        : [],
    );
  const excluded = [...new Set([...others, ...otherExerciseIds])];
  if (!owner) return { alternatives: [], excludeExerciseIds: excluded };
  const alternatives = ownAlternatives.flatMap((row) =>
    row.exerciseId === null
      ? []
      : [
          {
            activityId: row.id,
            exerciseId: row.exerciseId,
            name: name(row.exerciseId),
          },
        ],
  );
  return {
    alternatives,
    excludeExerciseIds: [
      ...new Set([...alternatives.map((item) => item.exerciseId), ...excluded]),
    ],
  };
}

/** Point a row at a newly selected exercise and reset what depended on it. */
export function applyExerciseSelection<T extends DraftAlternative>(
  activity: T,
  exercise: SelectedExercise,
): T {
  const percent = exercise.oneRepMax !== null && exercise.oneRepMax.value > 0;
  const reset = (set: DraftSet): DraftSet => ({
    ...set,
    weightValue: null,
    weightUnit: null,
    feedback: "Neutral",
  });
  return {
    ...activity,
    exerciseId: exercise.id,
    loadType: percent ? "PERCENT" : "RPE",
    loadValue: percent ? 0.75 : 8,
    warmupSets: activity.warmupSets.map(reset),
    mainSets: activity.mainSets.map(reset),
  };
}

/** Apply a chosen load; percentage loads derive weights, so planned ones clear. */
export function applyLoadSelection<T extends DraftAlternative>(
  activity: T,
  load: { type: "PERCENT" | "RPE"; value: number },
): T {
  const clear = (set: DraftSet): DraftSet =>
    set.status === "Planned"
      ? { ...set, weightValue: null, weightUnit: null }
      : set;
  return {
    ...activity,
    loadType: load.type,
    loadValue: load.value,
    ...(load.type === "PERCENT"
      ? {
          warmupSets: activity.warmupSets.map(clear),
          mainSets: activity.mainSets.map(clear),
        }
      : {}),
  };
}

/**
 * Change how many sets of one kind a row has. New RPE sets copy the previous
 * set's weight. Returns null for an invalid count; `added` holds the new IDs.
 */
export function resizeSets<T extends DraftAlternative>(
  activity: T,
  kind: "Warmup" | "Main",
  text: string,
  createId: () => string,
  terminalEndMs: number | null | undefined,
): { activity: T; added: Set<string>; wasEmpty: boolean } | null {
  const count = text === "" ? 0 : Number(text);
  if (!Number.isInteger(count) || count < 0 || count > 99) return null;
  const field = kind === "Warmup" ? "warmupSets" : "mainSets";
  const original = activity[field];
  const sets = original.slice(0, count);
  while (sets.length < count) {
    const last = sets.at(-1);
    const next = newDraftSet(createId, terminalEndMs);
    if (activity.loadType === "RPE" && last) {
      next.weightValue = last.weightValue;
      next.weightUnit = last.weightUnit;
    }
    sets.push(next);
  }
  return {
    activity: { ...activity, [field]: sets },
    added: new Set(sets.slice(original.length).map(({ id }) => id)),
    wasEmpty: original.length === 0,
  };
}

/** Fill a hinted weight into newly added sets that have none yet. */
export function applyWeightHint<T extends DraftAlternative>(
  activity: T,
  kind: "Warmup" | "Main",
  added: Set<string>,
  weight: { value: number; unit: "lbs" | "kg" },
): T {
  const field = kind === "Warmup" ? "warmupSets" : "mainSets";
  return {
    ...activity,
    [field]: activity[field].map((set) =>
      added.has(set.id) && set.weightValue === null
        ? { ...set, weightValue: weight.value, weightUnit: weight.unit }
        : set,
    ),
  };
}
