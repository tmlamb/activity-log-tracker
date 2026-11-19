import { addWeeks, differenceInCalendarWeeks, startOfWeek } from "date-fns";

import type {
  ExerciseSeriesFacts,
  SeriesAlternative,
  SeriesSetFact,
} from "../repositories/exercise-series";
import { plannedSetWeight } from "./set-execution";

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
}
export interface ExerciseSeriesProjection {
  exerciseName: string;
  sessionName: string;
  series: {
    setType: "Warmup" | "Main";
    setNumber: number;
    selected: boolean;
    points: ExerciseSeriesPoint[];
  }[];
  partial: boolean;
  alternatives: SeriesAlternative[];
}

/** Construct series from compact facts, after the read transaction releases. */
export function buildExerciseSeriesProjection(
  facts: ExerciseSeriesFacts,
  nowMs: number,
): ExerciseSeriesProjection {
  if (!Number.isFinite(new Date(nowMs).getTime()))
    throw new Error("A valid insights clock is required.");
  const bySession = new Map<
    string,
    { warmup: SeriesSetFact[]; main: SeriesSetFact[] }
  >();
  for (const set of facts.sets) {
    const group = bySession.get(set.sessionId) ?? { warmup: [], main: [] };
    (set.kind === "Warmup" ? group.warmup : group.main).push(set);
    bySession.set(set.sessionId, group);
  }
  const currentSets = bySession.get(facts.reference.sessionId);
  if (!currentSets) throw new Error("The selected workout set is missing.");
  const selectedSets = [...currentSets.warmup, ...currentSets.main];
  if (!selectedSets.some(({ id }) => id === facts.reference.setId))
    throw new Error("The selected workout set is missing.");
  const max =
    facts.selection.maxValue !== null && facts.selection.maxUnit !== null
      ? { value: facts.selection.maxValue, unit: facts.selection.maxUnit }
      : null;
  let partial = false;
  const series = selectedSets.map((selected) => {
    const setType = selected.kind;
    const currentGroup =
      setType === "Warmup" ? currentSets.warmup : currentSets.main;
    const index = currentGroup.findIndex(({ id }) => id === selected.id);
    const points = facts.sessions.map<ExerciseSeriesPoint>((session) => {
      const current = session.id === facts.reference.sessionId;
      const sessionSets = bySession.get(session.id);
      const set = (
        setType === "Warmup" ? sessionSets?.warmup : sessionSets?.main
      )?.[index];
      const actual = set?.actualReps ?? 0;
      const completed = set?.status === "Done";
      const notStarted = current && !!set && actual <= 0;
      const reps = !set
        ? 0
        : current
          ? actual > 0
            ? actual
            : Math.max(set.plannedReps ?? 0, 0)
          : set.status === "Done" && actual > 0
            ? actual
            : 0;
      const storedWeight =
        set?.weightValue !== null &&
        set?.weightValue !== undefined &&
        set.weightUnit !== null
          ? { value: set.weightValue, unit: set.weightUnit }
          : null;
      const weight =
        storedWeight ??
        (current && set
          ? plannedSetWeight(
              {
                loadType: set.loadType,
                loadValue: set.loadValue,
                warmupSetCount: currentSets.warmup.length,
              },
              { kind: set.kind, index, weight: null },
              max,
            )
          : null);
      const pointPartial =
        !!set &&
        ((set.status === "Done" && set.actualReps === null) ||
          (current && actual <= 0 && set.plannedReps === null) ||
          // No weight means no added load (e.g. bodyweight) unless a percent
          // load can't be resolved without a 1RM.
          (reps > 0 && weight === null && set.loadType === "PERCENT"));
      partial ||= pointPartial;
      const weightLbs = weight
        ? weight.unit === "kg"
          ? weight.value * 2.2046226218
          : weight.value
        : 0;
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
    alternatives: facts.alternatives,
  };
}
