import type { Equipment, Exercise, Program } from "@activity-log/ui/utils";
import {
  normalizeExerciseName,
  normalizeMuscleGroups,
} from "@activity-log/ui/utils";

import {
  createDefaultExercises,
  createDefaultMuscleGroups,
} from "./exercise-defaults";

export interface WorkoutData {
  programs: Program[];
  exercises: Exercise[];
  equipment: Equipment;
  muscleGroups: string[];
}

export const createDefaultEquipment = (): Equipment => ({
  barbells: [
    { value: 25, unit: "lbs", barbellId: "1" },
    { value: 35, unit: "lbs", barbellId: "2" },
    { value: 45, unit: "lbs", barbellId: "3" },
  ],
  plates: [
    { value: 2.5, unit: "lbs", plateId: "1", quantity: 2 },
    { value: 5, unit: "lbs", plateId: "2", quantity: 2 },
    { value: 10, unit: "lbs", plateId: "3", quantity: 4 },
    { value: 25, unit: "lbs", plateId: "4", quantity: 2 },
    { value: 35, unit: "lbs", plateId: "5", quantity: 2 },
    { value: 45, unit: "lbs", plateId: "6", quantity: 8 },
  ],
});

export const normalizeEquipment = (
  equipment: Partial<Equipment> = {},
): Equipment => ({
  barbells: equipment.barbells ?? [],
  plates: equipment.plates ?? [],
});

export const normalizeExerciseMuscles = (exercise: Exercise): Exercise => {
  const legacyExercise = exercise as Exercise & { primaryMuscle?: string };
  const primaryMuscles = exercise.primaryMuscles ?? [
    legacyExercise.primaryMuscle,
  ];
  return { ...exercise, primaryMuscles: normalizeMuscleGroups(primaryMuscles) };
};

export const migrateSavedExerciseMuscles = (exercises: Exercise[]) => {
  const presetMusclesByName = new Map(
    createDefaultExercises().map((exercise) => [
      normalizeExerciseName(exercise.name),
      exercise.primaryMuscles,
    ]),
  );
  return exercises.map((exercise) => {
    const normalizedExercise = normalizeExerciseMuscles(exercise);
    const presetMuscles = presetMusclesByName.get(
      normalizeExerciseName(exercise.name),
    );
    return exercise.primaryMuscles === undefined &&
      (normalizedExercise.primaryMuscles?.length ?? 0) === 0 &&
      presetMuscles
      ? { ...normalizedExercise, primaryMuscles: presetMuscles }
      : normalizedExercise;
  });
};

export const normalizeSessionDeloads = (programs: Program[]) =>
  programs.map((program) => ({
    ...program,
    sessions: program.sessions.map((session) => ({
      ...session,
      deload: session.deload === true,
    })),
  }));

export const createDefaultWorkoutStoreData = (): WorkoutData => ({
  programs: [],
  exercises: [],
  equipment: createDefaultEquipment(),
  muscleGroups: createDefaultMuscleGroups(),
});

export const normalizeMuscleCatalog = (muscleGroups: readonly unknown[]) =>
  normalizeMuscleGroups(muscleGroups).sort((a, b) => a.localeCompare(b));
