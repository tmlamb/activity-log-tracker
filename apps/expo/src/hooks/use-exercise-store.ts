import Papa from "papaparse";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Exercise, MuscleGroup } from "@activity-log/ui/utils";
import {
  normalizeMuscleGroups,
  sortRecordsByName,
} from "@activity-log/ui/utils";

// These are presets that will be available in the app by default.
const exerciseData = `name,loadKind,primaryMuscles
Back Squat,BARBELL,Quads
Dumbbell Incline Press,WEIGHT_PAIR,Chest
Lying Leg Curl,SINGLE_WEIGHT,Hamstrings
Leg Curl,SINGLE_WEIGHT,Hamstrings
Pronated Pulldown,SINGLE_WEIGHT,Back
Supinated EZ Bar Curl,BARBELL,Biceps
Hanging Leg Raise,SINGLE_WEIGHT,Core
Barbell Bench Press,BARBELL,Chest
Low To High Cable Fly,WEIGHT_PAIR,Chest
Barbell Hip Thrust,BARBELL,Glutes
Romanian Deadlift,BARBELL,"Hamstrings|Glutes"
Chest-supported T-Bar Row,SINGLE_WEIGHT,Back
Arnold Press,WEIGHT_PAIR,Shoulders
Tricep Press-down,SINGLE_WEIGHT,Triceps
Dumbbell Shrug,WEIGHT_PAIR,Traps
Hex Bar Shrug,BARBELL,Traps
Smith Machine Shrug,BARBELL,Traps
Weighted Pull-up,SINGLE_WEIGHT,Back
Humble Row,WEIGHT_PAIR,"Traps|Back|Shoulders"
Leg Press,SINGLE_WEIGHT,"Quads|Hamstrings|Glutes"
Standing Calf Raise,SINGLE_WEIGHT,Calves
Cable Rope Upright Row,SINGLE_WEIGHT,"Shoulders|Traps"
Hammer Curl,WEIGHT_PAIR,"Biceps|Forearms"
Deadlift,BARBELL,"Glutes|Hamstrings|Back"
Weighted Dip,SINGLE_WEIGHT,"Chest|Triceps"
Glute Ham Raise,SINGLE_WEIGHT,"Hamstrings|Glutes"
Leg Extension,SINGLE_WEIGHT,Quads
Cable Pull-over,SINGLE_WEIGHT,Back
Dumbbell Lateral Raise,WEIGHT_PAIR,Shoulders
EZ Bar Skull Crusher,BARBELL,Triceps
Overhead Press,WEIGHT_PAIR,Shoulders
Egyptian Lateral Raise,SINGLE_WEIGHT,Shoulders
Cable Seated Row,SINGLE_WEIGHT,Back
Seated Hip Abduction,SINGLE_WEIGHT,Abductors
Incline Dumbbell Curl,WEIGHT_PAIR,Biceps
Bicycle Crunch,SINGLE_WEIGHT,Core
Push-up,SINGLE_WEIGHT,"Chest"
Swiss Ball Leg Curl,SINGLE_WEIGHT,Hamstrings
Chin-up,SINGLE_WEIGHT,"Back|Biceps"
Ab Wheel Rollout,SINGLE_WEIGHT,Core
Low Incline Dumbbell Press,WEIGHT_PAIR,Chest
Dumbbell Row,WEIGHT_PAIR,Back
Overhead Tricep Extension,SINGLE_WEIGHT,Triceps
Single-Leg Leg Press,SINGLE_WEIGHT,"Quads|Glutes"
Decline Bench Press,BARBELL,Chest
Pendlay Row,BARBELL,Back
EZ Bar Curl,BARBELL,Biceps
Cable Crunch,SINGLE_WEIGHT,Core
Lat Pulldown,SINGLE_WEIGHT,Back
Rope Face Pull,SINGLE_WEIGHT,"Shoulders"
Tricep Kickback,SINGLE_WEIGHT,Triceps
Dumbbell Lunge,WEIGHT_PAIR,Quads
Cable Upright Row,SINGLE_WEIGHT,"Shoulders|Traps"
Sissy Squat,SINGLE_WEIGHT,Quads
Reverse Dumbbell Fly,WEIGHT_PAIR,Shoulders
Skull Crusher,WEIGHT_PAIR,Triceps
Lateral Band Walk,SINGLE_WEIGHT,"Glutes|Abductors"`;

interface DefaultExerciseRow {
  name: string;
  loadKind: Exercise["loadKind"];
  primaryMuscles: string;
}

export function createDefaultExercises() {
  const results = Papa.parse<DefaultExerciseRow>(exerciseData, {
    header: true,
  });
  const rows = results.data.map(({ primaryMuscles, ...exercise }) => ({
    ...exercise,
    primaryMuscles: normalizeMuscleGroups(
      primaryMuscles.split("|"),
    ) as MuscleGroup[],
  }));
  sortRecordsByName(rows);
  return rows;
}

export const createDefaultMuscleGroups = () =>
  Array.from(
    new Set(
      createDefaultExercises().flatMap((exercise) => exercise.primaryMuscles),
    ),
  ).sort((a, b) => a.localeCompare(b));

interface ExerciseStore {
  exercises: Pick<Exercise, "name" | "loadKind" | "primaryMuscles">[];
  resetExercises: () => void;
}

const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set) => ({
      exercises: createDefaultExercises(),
      resetExercises: () => {
        set({ exercises: createDefaultExercises() });
      },
    }),
    {
      name: "exercise-storage",
      version: 2,
      migrate: (persistedState, version) =>
        version < 2
          ? {
              ...(persistedState as Partial<ExerciseStore>),
              exercises: createDefaultExercises(),
            }
          : persistedState,
    },
  ),
);

export default useExerciseStore;
