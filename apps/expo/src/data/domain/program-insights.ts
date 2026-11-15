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
  const muscles = new Map<string, string[]>();
  for (const { exerciseId, name } of facts.muscles) {
    const labels = muscles.get(exerciseId) ?? [];
    labels.push(name);
    muscles.set(exerciseId, labels);
  }
  for (const [id, labels] of muscles)
    muscles.set(id, normalizeMuscleGroups(labels));
  const names = new Map<string, string>();
  const weekly = new Map<number, Map<string, MuscleMetrics>>();
  let partial = false;
  for (const set of facts.sets) {
    const session = sessions.get(set.sessionId);
    if (!session) throw new Error("An insight fact has no owning session.");
    const date = session.status === "Planned" ? nowMs : session.startMs;
    if (date === null) continue;
    const week = weekAndDayNumbersFromStart(start, new Date(date)).week;
    if (week < 1) continue;
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
    const labels = muscles.get(set.exerciseId) ?? [];
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
    const missingWeight = weightValue === null || weightUnit === null;
    const incomplete = setPartial || missingWeight;
    partial ||= incomplete;
    const weightLbs =
      weightValue === null || weightUnit === null
        ? null
        : weightUnit === "kg"
          ? weightValue * 2.2046226218
          : weightValue;
    const groups = weekly.get(week) ?? new Map<string, MuscleMetrics>();
    weekly.set(week, groups);
    for (const label of labels) {
      const key = label.toLocaleLowerCase();
      const name = names.get(key) ?? label;
      names.set(key, name);
      const metrics = groups.get(key) ?? {
        ...emptyMetrics(),
        muscleGroup: name,
        pending: emptyMetrics(),
        partial: false,
      };
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
      groups.set(key, metrics);
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
