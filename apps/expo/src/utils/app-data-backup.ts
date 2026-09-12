import { z } from "zod";

import type { Equipment, Exercise, Program } from "@activity-log/ui/utils";

export const ACTIVITY_LOG_BACKUP_FORMAT = "activity-log-tracker-backup";
export const ACTIVITY_LOG_BACKUP_VERSION = 1;

export type ExercisePreset = Pick<
  Exercise,
  "name" | "loadKind" | "primaryMuscles"
>;

export interface WorkoutBackupData {
  programs: Program[];
  exercises: Exercise[];
  equipment: Equipment;
  muscleGroups: string[];
}

export interface ExerciseBackupData {
  exercises: ExercisePreset[];
}

export interface ActivityLogBackupStores {
  "workout-storage": WorkoutBackupData;
  "exercise-storage": ExerciseBackupData;
}

const dateSchema = z.iso.datetime().transform((value) => new Date(value));
const weightSchema = z.object({
  value: z.number(),
  unit: z.enum(["lbs", "kg"]),
});
const workoutSetShape = {
  workoutSetId: z.string(),
  start: dateSchema.optional(),
  end: dateSchema.optional(),
  status: z.enum(["Planned", "Ready", "Done", "Incomplete"]),
  weight: weightSchema.optional(),
  actualReps: z.number().optional(),
  feedback: z.enum(["Easy", "Neutral", "Hard"]),
};
const activitySchema = z.object({
  activityId: z.string(),
  reps: z.number(),
  load: z.object({
    value: z.number(),
    type: z.enum(["PERCENT", "RPE"]),
  }),
  rest: z.number(),
  exerciseId: z.string(),
  warmupSets: z.array(
    z.object({ ...workoutSetShape, type: z.literal("Warmup") }),
  ),
  mainSets: z.array(z.object({ ...workoutSetShape, type: z.literal("Main") })),
});
const exerciseSchema: z.ZodType<Exercise> = z.object({
  name: z.string(),
  exerciseId: z.string(),
  loadKind: z.enum(["BARBELL", "WEIGHT_PAIR", "SINGLE_WEIGHT"]),
  barbellId: z.string().optional(),
  oneRepMax: weightSchema.optional(),
  primaryMuscles: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().optional(),
  deleted: z.boolean().optional(),
});
const presetExerciseSchema: z.ZodType<ExercisePreset> = z.object({
  name: z.string(),
  loadKind: z.enum(["BARBELL", "WEIGHT_PAIR", "SINGLE_WEIGHT"]),
  primaryMuscles: z.array(z.string().trim().min(1)).optional(),
});
const workoutDataSchema: z.ZodType<WorkoutBackupData> = z.object({
  programs: z.array(
    z.object({
      name: z.string(),
      programId: z.string(),
      sessions: z.array(
        z.object({
          name: z.string(),
          sessionId: z.string(),
          templateId: z.string().optional(),
          deload: z.boolean(),
          start: dateSchema.optional(),
          end: dateSchema.optional(),
          lastActivityAt: dateSchema.optional(),
          status: z.enum(["Planned", "Ready", "Incomplete", "Done"]),
          activities: z.array(activitySchema),
        }),
      ),
    }),
  ),
  exercises: z.array(exerciseSchema),
  equipment: z.object({
    barbells: z.array(
      weightSchema.extend({
        barbellId: z.string(),
      }),
    ),
    plates: z.array(
      weightSchema.extend({
        plateId: z.string(),
        quantity: z.number(),
      }),
    ),
  }),
  muscleGroups: z.array(z.string().trim().min(1)),
});
const backupSchema = z.object({
  format: z.literal(ACTIVITY_LOG_BACKUP_FORMAT),
  version: z.literal(ACTIVITY_LOG_BACKUP_VERSION),
  createdAt: z.iso.datetime(),
  stores: z.object({
    "workout-storage": workoutDataSchema,
    "exercise-storage": z.object({
      exercises: z.array(presetExerciseSchema),
    }),
  }),
});

export class InvalidActivityLogBackupError extends Error {
  constructor() {
    super("The selected file is not a valid Activity Log backup.");
    this.name = "InvalidActivityLogBackupError";
  }
}

export const serializeActivityLogBackup = (
  stores: ActivityLogBackupStores,
  createdAt = new Date(),
) =>
  JSON.stringify(
    {
      format: ACTIVITY_LOG_BACKUP_FORMAT,
      version: ACTIVITY_LOG_BACKUP_VERSION,
      createdAt: createdAt.toISOString(),
      stores,
    },
    null,
    2,
  );

export const parseActivityLogBackup = (
  contents: string,
): ActivityLogBackupStores => {
  try {
    return backupSchema.parse(JSON.parse(contents) as unknown).stores;
  } catch {
    throw new InvalidActivityLogBackupError();
  }
};
