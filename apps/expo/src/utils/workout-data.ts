import { z } from "zod";

import type { Equipment, Exercise, Program } from "@activity-log/ui/utils";
import { normalizeMuscleGroups } from "@activity-log/ui/utils";

export interface WorkoutData {
  programs: Program[];
  exercises: Exercise[];
  equipment: Equipment;
  muscleGroups?: string[];
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
const exerciseSchema: z.ZodType<Exercise> = z
  .object({
    name: z.string(),
    exerciseId: z.string(),
    loadKind: z.enum(["BARBELL", "WEIGHT_PAIR", "SINGLE_WEIGHT"]),
    barbellId: z.string().optional(),
    oneRepMax: weightSchema.optional(),
    primaryMuscles: z.array(z.string().trim().min(1)).optional(),
    // Preserve recognized muscle targets from exports created before this field
    // supported multiple selections.
    primaryMuscle: z.string().optional(),
    notes: z.string().optional(),
    deleted: z.boolean().optional(),
  })
  .transform(({ primaryMuscle, primaryMuscles, ...exercise }) => ({
    ...exercise,
    primaryMuscles: normalizeMuscleGroups(primaryMuscles ?? [primaryMuscle]),
  }));
const workoutDataSchema: z.ZodType<WorkoutData> = z
  .object({
    programs: z.array(
      z.object({
        name: z.string(),
        programId: z.string(),
        sessions: z.array(
          z.object({
            name: z.string(),
            sessionId: z.string(),
            templateId: z.string().optional(),
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
    muscleGroups: z.array(z.string().trim().min(1)).optional(),
  })
  .transform(({ muscleGroups, exercises, ...workoutData }) => ({
    ...workoutData,
    exercises,
    muscleGroups: muscleGroups
      ? normalizeMuscleGroups([
          ...muscleGroups,
          ...exercises.flatMap((exercise) => exercise.primaryMuscles ?? []),
        ])
      : undefined,
  }));

export const serializeWorkoutData = (data: WorkoutData) =>
  JSON.stringify(data, null, 2);

export const parseWorkoutData = (contents: string): WorkoutData =>
  workoutDataSchema.parse(JSON.parse(contents) as unknown);
