import { differenceInCalendarDays } from "date-fns";

export interface Weight {
  value: number;
  unit: "lbs" | "kg";
}

export interface Load {
  value: number;
  type: "PERCENT" | "RPE";
}

export type EquipmentPlate = Weight & {
  plateId: string;
  quantity: number;
};

export type EquipmentBarbell = Weight & {
  barbellId: string;
};

export interface WorkoutSet {
  workoutSetId: string;
  start?: Date;
  end?: Date;
  status: "Planned" | "Ready" | "Done" | "Incomplete";
  type: "Warmup" | "Main";
  weight?: Weight;
  actualReps?: number;
  feedback: "Easy" | "Neutral" | "Hard";
}

export type WarmupSet = WorkoutSet & {
  type: "Warmup";
};

export type MainSet = WorkoutSet & {
  type: "Main";
};

export interface Activity {
  activityId: string;
  reps: number;
  load: Load;
  rest: number;
  exerciseId: string;
  warmupSets: WarmupSet[];
  mainSets: MainSet[];
}

export interface Exercise {
  name: string;
  exerciseId: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT";
  barbellId?: string;
  oneRepMax?: Weight;
  primaryMuscle?: string;
  notes?: string;
}

export interface Session {
  name: string;
  sessionId: string;
  templateId?: string;
  start?: Date;
  end?: Date;
  lastActivityAt?: Date;
  status: "Planned" | "Ready" | "Done";
  activities: Activity[];
}

export interface Program {
  name: string;
  programId: string;
  sessions: Session[];
}

export interface Equipment {
  barbells: EquipmentBarbell[];
  plates: EquipmentPlate[];
}

export const SESSION_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
export const LEGACY_SESSION_DURATION_MS = 60 * 60 * 1000;

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const latestCompletedSetEnd = (session: Session) => {
  let latestEnd: Date | undefined;

  session.activities.forEach((activity) => {
    [...activity.warmupSets, ...activity.mainSets].forEach((workoutSet) => {
      if (
        workoutSet.status === "Done" &&
        isValidDate(workoutSet.end) &&
        (!latestEnd || workoutSet.end.getTime() > latestEnd.getTime())
      ) {
        latestEnd = workoutSet.end;
      }
    });
  });

  return latestEnd;
};

export const finalizeWorkoutSet = <T extends WorkoutSet>(
  workoutSet: T,
  end: Date,
): T => {
  if ((workoutSet.actualReps ?? 0) > 0) {
    if (workoutSet.status === "Done") return workoutSet;

    const setEnd = workoutSet.end ?? end;
    return {
      ...workoutSet,
      start:
        workoutSet.start && workoutSet.start.getTime() <= setEnd.getTime()
          ? workoutSet.start
          : setEnd,
      end: setEnd,
      status: "Done",
    };
  }

  if (!workoutSet.start) {
    return { ...workoutSet, status: "Incomplete" };
  }

  const setEnd = workoutSet.end ?? end;

  return {
    ...workoutSet,
    start:
      workoutSet.start.getTime() <= setEnd.getTime()
        ? workoutSet.start
        : setEnd,
    end: setEnd,
    status: "Incomplete",
  };
};

export const reconcileCompletedWorkoutSet = <T extends WorkoutSet>(
  workoutSet: T,
  actualReps: number | undefined,
  sessionEnd: Date,
): T => {
  const updatedWorkoutSet = { ...workoutSet, actualReps };

  return (actualReps ?? 0) > 0
    ? finalizeWorkoutSet(updatedWorkoutSet, sessionEnd)
    : { ...updatedWorkoutSet, status: "Incomplete" };
};

export const completeSession = (session: Session, end: Date): Session => ({
  ...session,
  end,
  lastActivityAt: end,
  status: "Done",
  activities: session.activities.map((activity) => ({
    ...activity,
    warmupSets: activity.warmupSets.map((workoutSet) =>
      finalizeWorkoutSet(workoutSet, end),
    ),
    mainSets: activity.mainSets.map((workoutSet) =>
      finalizeWorkoutSet(workoutSet, end),
    ),
  })),
});

export const cleanupInactiveSession = (
  session: Session,
  now = new Date(),
): Session => {
  if (session.status !== "Ready") return session;

  const lastActivityAt = isValidDate(session.lastActivityAt)
    ? session.lastActivityAt
    : undefined;
  if (
    lastActivityAt &&
    now.getTime() - lastActivityAt.getTime() < SESSION_INACTIVITY_TIMEOUT_MS
  ) {
    return session;
  }

  const end =
    lastActivityAt ??
    latestCompletedSetEnd(session) ??
    (isValidDate(session.start)
      ? new Date(session.start.getTime() + LEGACY_SESSION_DURATION_MS)
      : now);

  return completeSession(session, end);
};

export const plannedRepsFromTemplateActivity = (activity: Activity) => {
  const actualReps = activity.mainSets.reduce(
    (result, mainSet) => {
      if (
        mainSet.status === "Done" &&
        mainSet.actualReps != null &&
        mainSet.actualReps > 0
      ) {
        result.total += mainSet.actualReps;
        result.count += 1;
      }
      return result;
    },
    { total: 0, count: 0 },
  );

  if (!actualReps.count) return activity.reps;

  return Math.ceil(actualReps.total / actualReps.count);
};

export const dateRegex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;

export const normalizedLocalDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const weekAndDayFromStart = (start: Date, end: Date) => {
  const daysDiff = differenceInCalendarDays(
    normalizedLocalDate(end),
    normalizedLocalDate(start),
  );
  const week = Math.floor(daysDiff / 7) + 1;
  const day = (daysDiff % 7) + 1;
  return `${week > 1 ? `Week ${week}, ` : ""}Day ${day}`;
};

export const stringifyPercent = (value: number) =>
  `${Number(value.toFixed(2))}%`;

export const stringifyLoad = ({ type, value }: Load) =>
  type === "PERCENT" ? stringifyPercent(value * 100) : `RPE ${value}`;

export const stringifyWeight = (weight: Weight) =>
  `${weight.value} ${weight.unit}`;

export const round5 = (value: number) => Math.round(value / 5) * 5;

export const sortRecordsByName = (rows: { name: string }[]) =>
  rows.sort((a, b) => a.name.localeCompare(b.name));

export const normalizeExerciseName = (name: string) =>
  name.trim().replace(/\s+/g, "").toLocaleLowerCase();

export const exerciseNamesMatch = (a: string, b: string) =>
  normalizeExerciseName(a) === normalizeExerciseName(b);

export const sumPlateWeights = (plateWeights: number[]) =>
  plateWeights.reduce((total, p) => total + p, 0);
