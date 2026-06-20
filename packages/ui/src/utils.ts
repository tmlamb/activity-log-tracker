import { differenceInCalendarDays } from "date-fns";

export interface Weight {
  value: number;
  unit: "lbs" | "kg";
}

export interface Load {
  value: number;
  type: "PERCENT" | "RPE";
}

export type PlatePair = Weight & {
  platePairId: string;
};

export interface WorkoutSet {
  workoutSetId: string;
  start?: Date;
  end?: Date;
  status: "Planned" | "Ready" | "Done";
  type: "Warmup" | "Main";
  actualWeight?: Weight;
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
  oneRepMax?: Weight;
  primaryMuscle?: string;
  notes?: string;
}

export interface Session {
  name: string;
  sessionId: string;
  start?: Date;
  end?: Date;
  status: "Planned" | "Ready" | "Done";
  activities: Activity[];
}

export interface Program {
  name: string;
  programId: string;
  sessions: Session[];
}

export interface Equipment {
  barbellWeight: Weight;
  platePairs: PlatePair[];
}

export const dateRegex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;

export const validWeights = [1.25, 2.5, 5, 10, 25, 35, 45, 55, 65];

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

export const stringifyLoad = ({ type, value }: Load) =>
  type === "PERCENT" ? `${(value * 100).toFixed(2)}%` : `RPE ${value}`;

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

export const recentActivityByExercise = (
  program?: Program,
  exerciseId?: string,
  session?: Session,
  activity?: Activity,
): Activity | undefined => {
  for (let i = (program?.sessions.length ?? 0) - 1; i >= 0; i -= 1) {
    const s = program?.sessions[i];
    if (!s) continue;
    for (let j = s.activities.length - 1; j >= 0; j -= 1) {
      const a = s.activities[j];
      if (!a) continue;
      if (
        a.exerciseId === exerciseId &&
        s.sessionId !== session?.sessionId &&
        (!activity ||
          (Math.abs(activity.mainSets.length - a.mainSets.length) < 2 &&
            Math.abs(activity.reps - a.reps) < 3 &&
            Math.abs(activity.load.value - a.load.value) < 1))
      ) {
        return a;
      }
    }
  }

  return undefined;
};
