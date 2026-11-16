import { addDays, startOfDay } from "date-fns";

import type { ProgramInsightMetrics } from "@activity-log/ui/utils";
import {
  normalizeMuscleGroups,
  round5,
  weekAndDayNumbersFromStart,
} from "@activity-log/ui/utils";

import type { ProgramInsightFacts } from "../repositories/program-insights";

type MuscleMetrics = ProgramInsightMetrics & {
  muscleGroup: string;
  pending: ProgramInsightMetrics;
  partial: boolean;
};
export interface ProgramInsightProjection {
  programName: string;
  muscleGroups: string[];
  weeks: {
    week: number;
    startMs: number;
    endMs: number;
    muscleGroups: MuscleMetrics[];
  }[];
  partial: boolean;
}
const emptyMetrics = (): ProgramInsightMetrics => ({
  sets: 0,
  reps: 0,
  volumeLbs: 0,
  hardSets: 0,
  easySets: 0,
});

/** Compute presentation-independent aggregates after releasing the SQL snapshot. */
export function buildProgramInsightProjection(
  facts: ProgramInsightFacts,
  nowMs: number,
): ProgramInsightProjection {
  const now = new Date(nowMs);
  if (!Number.isFinite(now.getTime()))
    throw new Error("A valid insights clock is required.");
  const first = facts.sessions
    .filter((s) => s.status !== "Planned" && s.startMs !== null)
    .reduce<
      number | null
    >((min, s) => (s.startMs !== null && (min === null || s.startMs < min) ? s.startMs : min), null);
  if (first === null && !facts.sessions.some((s) => s.status === "Planned"))
    return {
      programName: facts.programName,
      muscleGroups: [],
      weeks: [],
      partial: false,
    };
  const start = startOfDay(new Date(first ?? nowMs));
  const sessions = new Map(facts.sessions.map((s) => [s.id, s]));
  let lastWeek = Math.max(weekAndDayNumbersFromStart(start, now).week, 1);
  for (const session of facts.sessions) {
    const date = session.status === "Planned" ? nowMs : session.startMs;
    if (date !== null)
      lastWeek = Math.max(
        lastWeek,
        weekAndDayNumbersFromStart(start, new Date(date)).week,
      );
  }
  // The week depends only on the session, so compute it once per session
  // rather than once per set.
  const weekBySession = new Map<string, number | null>();
  for (const session of facts.sessions) {
    const date = session.status === "Planned" ? nowMs : session.startMs;
    weekBySession.set(
      session.id,
      date === null
        ? null
        : weekAndDayNumbersFromStart(start, new Date(date)).week,
    );
  }
  const muscles = new Map<string, string[]>();
  for (const { exerciseId, name } of facts.muscles) {
    const labels = muscles.get(exerciseId) ?? [];
    labels.push(name);
    muscles.set(exerciseId, labels);
  }
  const labelsByExercise = new Map<string, { key: string; label: string }[]>();
  for (const [id, labels] of muscles)
    labelsByExercise.set(
      id,
      normalizeMuscleGroups(labels).map((label) => ({
        key: label.toLocaleLowerCase(),
        label,
      })),
    );
  const names = new Map<string, string>();
  const weekly = new Map<number, Map<string, MuscleMetrics>>();
  const metricsFor = (week: number, key: string, label: string) => {
    const groups = weekly.get(week) ?? new Map<string, MuscleMetrics>();
    weekly.set(week, groups);
    const name = names.get(key) ?? label;
    names.set(key, name);
    const metrics = groups.get(key) ?? {
      ...emptyMetrics(),
      muscleGroup: name,
      pending: emptyMetrics(),
      partial: false,
    };
    groups.set(key, metrics);
    return metrics;
  };
  const weightInLbs = (value: number | null, unit: "lbs" | "kg" | null) =>
    value === null || unit === null
      ? null
      : unit === "kg"
        ? value * 2.2046226218
        : value;
  let partial = false;
  // Completed sets arrive pre-grouped by session, exercise and weight. A group
  // contributes exactly what its sets would one at a time.
  for (const group of facts.completed) {
    if (!sessions.has(group.sessionId))
      throw new Error("An insight fact has no owning session.");
    const week = weekBySession.get(group.sessionId);
    if (week == null || week < 1) continue;
    if (group.exerciseId === null || group.exerciseName === null) {
      partial = true;
      continue;
    }
    const labels = labelsByExercise.get(group.exerciseId) ?? [];
    if (!labels.length) continue;
    const weightLbs = weightInLbs(group.weightValue, group.weightUnit);
    // No weight means no added load (e.g. bodyweight): zero volume, not unknown.
    const incomplete = group.loadKind === null;
    partial ||= incomplete;
    for (const { key, label } of labels) {
      const metrics = metricsFor(week, key, label);
      metrics.partial ||= incomplete;
      metrics.sets += group.sets;
      metrics.reps += group.reps;
      if (weightLbs !== null && group.loadKind !== null)
        metrics.volumeLbs +=
          group.reps * weightLbs * (group.loadKind === "WEIGHT_PAIR" ? 2 : 1);
      metrics.hardSets += group.hardSets;
      metrics.easySets += group.easySets;
    }
  }
  // Pending sets and sets with unknown reps, one row each.
  for (const set of facts.sets) {
    const session = sessions.get(set.sessionId);
    if (!session) throw new Error("An insight fact has no owning session.");
    const week = weekBySession.get(set.sessionId);
    if (week == null || week < 1) continue;
    const completed = set.status === "Done" && (set.actualReps ?? 0) > 0;
    const unknownCompleted = set.status === "Done" && set.actualReps === null;
    const pending =
      (session.status === "Planned" || session.status === "Ready") &&
      (set.status === "Planned" || set.status === "Ready");
    if (!completed && !pending && !unknownCompleted) continue;
    if (set.exerciseId === null || set.exerciseName === null) {
      partial = true;
      continue;
    }
    const labels = labelsByExercise.get(set.exerciseId) ?? [];
    if (!labels.length) continue;
    const setPartial =
      unknownCompleted ||
      set.loadKind === null ||
      (pending && set.plannedReps === null);
    const reps = pending
      ? set.plannedReps === null
        ? null
        : Math.max(set.plannedReps, 0)
      : set.actualReps;
    let weightValue = set.weightValue;
    let weightUnit = set.weightUnit;
    if (
      pending &&
      weightValue === null &&
      set.loadType === "PERCENT" &&
      set.loadValue &&
      set.maxValue
    ) {
      weightValue = round5(set.maxValue * set.loadValue);
      weightUnit = set.maxUnit;
    }
    // Only a percent load without a 1RM is unknown; otherwise no weight means
    // no added load (e.g. bodyweight) and counts as zero volume.
    const missingWeight =
      set.loadType === "PERCENT" &&
      (weightValue === null || weightUnit === null);
    const incomplete = setPartial || missingWeight;
    partial ||= incomplete;
    const weightLbs = weightInLbs(weightValue, weightUnit);
    for (const { key, label } of labels) {
      const metrics = metricsFor(week, key, label);
      metrics.partial ||= incomplete;
      const target = pending ? metrics.pending : metrics;
      if (!unknownCompleted) target.sets++;
      if (reps !== null && !unknownCompleted) target.reps += reps;
      if (
        reps !== null &&
        weightLbs !== null &&
        set.loadKind !== null &&
        !unknownCompleted
      )
        target.volumeLbs +=
          reps * weightLbs * (set.loadKind === "WEIGHT_PAIR" ? 2 : 1);
      if (completed) {
        target.hardSets += Number(set.feedback === "Hard");
        target.easySets += Number(set.feedback === "Easy");
      }
    }
  }
  return {
    programName: facts.programName,
    partial,
    muscleGroups: [...names.values()].sort((a, b) => a.localeCompare(b)),
    weeks: Array.from({ length: lastWeek }, (_, index) => ({
      week: index + 1,
      startMs: addDays(start, index * 7).getTime(),
      endMs: addDays(start, index * 7 + 6).getTime(),
      muscleGroups: [...(weekly.get(index + 1)?.values() ?? [])].sort((a, b) =>
        a.muscleGroup.localeCompare(b.muscleGroup),
      ),
    })),
  };
}
