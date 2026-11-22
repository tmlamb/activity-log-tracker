import { addWeeks, differenceInCalendarWeeks, startOfWeek } from "date-fns";

import type {
  ExerciseSeriesFacts,
  SeriesAlternative,
  SeriesAlternativeSetFact,
  SeriesSession,
  SeriesSetFact,
} from "../repositories/exercise-series";
import type { SetKind } from "../repositories/session-detail";
import { plannedDropSetWeight, plannedSetWeight } from "./set-execution";

export interface ExerciseSeriesPoint {
  sessionId: string;
  dateMs: number | null;
  reps: number;
  weightLbs: number;
  volumeLbs: number;
  feedback: SeriesSetFact["feedback"] | null;
  current: boolean;
  completed: boolean;
  notStarted: boolean;
  partial: boolean;
  /**
   * Set when the point shows a set of an alternative, performed in place of
   * the exercise's own: the alternative's exercise.
   */
  alternativeName?: string;
}
export interface ExerciseSeriesProjection {
  exerciseName: string;
  sessionName: string;
  series: {
    setType: SetKind;
    setNumber: number;
    selected: boolean;
    points: ExerciseSeriesPoint[];
  }[];
  partial: boolean;
  /** Main sets are performed as a superset, alternating with other exercises. */
  superset: boolean;
  alternatives: SeriesAlternative[];
}

function storedWeightOf(
  set: Pick<SeriesSetFact, "weightValue" | "weightUnit"> | undefined,
) {
  return set?.weightValue !== null &&
    set?.weightValue !== undefined &&
    set.weightUnit !== null
    ? { value: set.weightValue, unit: set.weightUnit }
    : null;
}

function weightInLbs(weight: { value: number; unit: "lbs" | "kg" } | null) {
  if (!weight) return 0;
  return weight.unit === "kg" ? weight.value * 2.2046226218 : weight.value;
}

/** The point for a completed set of an alternative. */
function standInPoint(
  set: SeriesAlternativeSetFact,
  session: SeriesSession,
  current: boolean,
  nowMs: number,
): ExerciseSeriesPoint {
  const weight = storedWeightOf(set);
  const reps = set.actualReps ?? 0;
  const weightLbs = weightInLbs(weight);
  return {
    sessionId: session.id,
    dateMs:
      set.startMs ??
      set.endMs ??
      session.startMs ??
      session.endMs ??
      (current ? nowMs : null),
    reps,
    weightLbs,
    volumeLbs: reps * weightLbs,
    feedback: set.feedback,
    current,
    completed: true,
    notStarted: false,
    // As for the exercise's own sets, only a percent load needs a weight.
    partial: weight === null && set.loadType === "PERCENT",
    alternativeName: set.alternativeName ?? "Unavailable exercise",
  };
}

/** Construct series from compact facts, after the read transaction releases. */
export function buildExerciseSeriesProjection(
  facts: ExerciseSeriesFacts,
  nowMs: number,
): ExerciseSeriesProjection {
  if (!Number.isFinite(new Date(nowMs).getTime()))
    throw new Error("A valid insights clock is required.");
  // Each session's sets by kind; a set matches the same-numbered set of its
  // kind in other sessions.
  const bySession = new Map<string, Record<SetKind, SeriesSetFact[]>>();
  for (const set of facts.sets) {
    const group = bySession.get(set.sessionId) ?? {
      Warmup: [],
      Main: [],
      Drop: [],
    };
    group[set.kind].push(set);
    bySession.set(set.sessionId, group);
  }
  // The set performed instead of each set, when an alternative was swapped in.
  const standIns = new Map<string, SeriesAlternativeSetFact>();
  const standInKey = (sessionId: string, kind: SetKind, position: number) =>
    `${sessionId}\u001f${kind}\u001f${position}`;
  for (const set of facts.alternativeSets) {
    const key = standInKey(set.sessionId, set.kind, set.position);
    if (!standIns.has(key)) standIns.set(key, set);
  }
  const currentSets = bySession.get(facts.reference.sessionId);
  if (!currentSets) throw new Error("The selected workout set is missing.");
  const selectedSets = [
    ...currentSets.Warmup,
    ...currentSets.Main,
    ...currentSets.Drop,
  ];
  if (!selectedSets.some(({ id }) => id === facts.reference.setId))
    throw new Error("The selected workout set is missing.");
  const max =
    facts.selection.maxValue !== null && facts.selection.maxUnit !== null
      ? { value: facts.selection.maxValue, unit: facts.selection.maxUnit }
      : null;
  let partial = false;
  const series = selectedSets.map((selected) => {
    const setType = selected.kind;
    const currentGroup = currentSets[setType];
    const index = currentGroup.findIndex(({ id }) => id === selected.id);
    const points = facts.sessions.map<ExerciseSeriesPoint>((session) => {
      const current = session.id === facts.reference.sessionId;
      const sessionSets = bySession.get(session.id);
      const set = sessionSets?.[setType][index];
      const actual = set?.actualReps ?? 0;
      const completed = set?.status === "Done";
      // Only the selected exercise of a session still to be performed has
      // pending and in-progress sets; otherwise only completed sets count.
      const performing =
        current &&
        !facts.selection.alternative &&
        (session.status === "Planned" || session.status === "Ready");
      const notStarted =
        performing &&
        (set?.status === "Planned" || set?.status === "Ready") &&
        actual <= 0;
      const reps = !set
        ? 0
        : notStarted
          ? Math.max(set.plannedReps ?? 0, 0)
          : (performing || completed) && actual > 0
            ? actual
            : 0;
      const standIn =
        reps > 0 || completed || notStarted
          ? undefined
          : standIns.get(standInKey(session.id, setType, index));
      if (standIn) {
        const point = standInPoint(standIn, session, current, nowMs);
        partial ||= point.partial;
        return point;
      }
      const activity = set && {
        loadType: set.loadType,
        loadValue: set.loadValue,
        warmupSetCount: currentSets.Warmup.length,
        dropPercent: set.dropPercent,
      };
      const weight =
        storedWeightOf(set) ??
        (current && (notStarted || reps > 0) && set && activity
          ? set.kind === "Drop"
            ? plannedDropSetWeight(
                activity,
                selectedSets.map((item) => ({
                  kind: item.kind,
                  weight: storedWeightOf(item),
                })),
                index,
                max,
              )
            : plannedSetWeight(
                activity,
                { kind: set.kind, index, weight: null },
                max,
              )
          : null);
      const pointPartial =
        !!set &&
        ((set.status === "Done" && set.actualReps === null) ||
          (notStarted && set.plannedReps === null) ||
          // No weight means no added load (e.g. bodyweight) unless a percent
          // load can't be resolved without a 1RM.
          (reps > 0 && weight === null && set.loadType === "PERCENT"));
      partial ||= pointPartial;
      const weightLbs = weightInLbs(weight);
      return {
        sessionId: session.id,
        dateMs:
          set?.startMs ??
          set?.endMs ??
          session.startMs ??
          session.endMs ??
          (current ? nowMs : null),
        reps,
        weightLbs,
        volumeLbs: reps * weightLbs,
        feedback: reps > 0 ? (set?.feedback ?? null) : null,
        current,
        completed,
        notStarted,
        partial: pointPartial,
      };
    });
    const withGaps = points.flatMap((point, pointIndex) => {
      const previous = points[pointIndex - 1];
      if (previous?.dateMs == null || point.dateMs === null) return [point];
      const gap = differenceInCalendarWeeks(
        new Date(point.dateMs),
        new Date(previous.dateMs),
      );
      const previousWeek = startOfWeek(new Date(previous.dateMs));
      const missing = Array.from(
        { length: Math.max(gap - 1, 0) },
        (_, weekIndex): ExerciseSeriesPoint => ({
          sessionId: `missing-week-${previous.sessionId}-${point.sessionId}-${weekIndex}`,
          dateMs: addWeeks(previousWeek, weekIndex + 1).getTime(),
          reps: 0,
          weightLbs: 0,
          volumeLbs: 0,
          feedback: null,
          current: false,
          completed: false,
          notStarted: false,
          partial: false,
        }),
      );
      return [...missing, point];
    });
    return {
      setType,
      setNumber: index + 1,
      selected: selected.id === facts.reference.setId,
      points: withGaps,
    };
  });
  return {
    exerciseName: facts.selection.exerciseName,
    sessionName: facts.selection.sessionName,
    series,
    partial,
    superset: facts.selection.superset,
    alternatives: facts.alternatives,
  };
}
