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
  status: "Planned" | "Ready" | "Done";
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
