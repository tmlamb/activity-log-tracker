import Papa from "papaparse";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Exercise } from "@activity-log/ui/utils";
import { sortRecordsByName } from "@activity-log/ui/utils";

// These are presets that will be available in the app by default.
const exerciseData = `name,loadKind
Back Squat,BARBELL
Dumbbell Incline Press,WEIGHT_PAIR
Lying Leg Curl,SINGLE_WEIGHT
Leg Curl,SINGLE_WEIGHT
Pronated Pulldown,SINGLE_WEIGHT
Supinated EZ Bar Curl,BARBELL
Hanging Leg Raise,SINGLE_WEIGHT
Barbell Bench Press,BARBELL
Low To High Cable Fly,WEIGHT_PAIR
Barbell Hip Thrust,BARBELL
Romanian Deadlift,BARBELL
Chest-supported T-Bar Row,SINGLE_WEIGHT
Arnold Press,WEIGHT_PAIR
Tricep Press-down,SINGLE_WEIGHT
Dumbbell Shrug,WEIGHT_PAIR
Hex Bar Shrug,BARBELL
Smith Machine Shrug,BARBELL
Weighted Pull-up,SINGLE_WEIGHT
Humble Row,WEIGHT_PAIR
Leg Press,SINGLE_WEIGHT
Standing Calf Raise,SINGLE_WEIGHT
Cable Rope Upright Row,SINGLE_WEIGHT
Hammer Curl,WEIGHT_PAIR
Deadlift,BARBELL
Weighted Dip,SINGLE_WEIGHT
Glute Ham Raise,SINGLE_WEIGHT
Leg Extension,SINGLE_WEIGHT
Cable Pull-over,SINGLE_WEIGHT
Dumbbell Lateral Raise,WEIGHT_PAIR
EZ Bar Skull Crusher,BARBELL
Overhead Press,BARBELL
Egyptian Lateral Raise,SINGLE_WEIGHT
Cable Seated Row,SINGLE_WEIGHT
Seated Hip Abduction,SINGLE_WEIGHT
Incline Dumbbell Curl,WEIGHT_PAIR
Bicycle Crunch,SINGLE_WEIGHT
Push-up,SINGLE_WEIGHT
Swiss Ball Leg Curl,SINGLE_WEIGHT
Chin-up,SINGLE_WEIGHT
Ab Wheel Rollout,SINGLE_WEIGHT
Low Incline Dumbbell Press,WEIGHT_PAIR
Dumbbell Row,WEIGHT_PAIR
Overhead Tricep Extension,SINGLE_WEIGHT
Single-Leg Leg Press,SINGLE_WEIGHT
Decline Bench Press,BARBELL
Pendlay Row,BARBELL
EZ Bar Curl,BARBELL
Cable Crunch,SINGLE_WEIGHT
Lat Pulldown,SINGLE_WEIGHT
Rope Face Pull,SINGLE_WEIGHT
Tricep Kickback,SINGLE_WEIGHT
Dumbbell Lunge,WEIGHT_PAIR
Cable Upright Row,SINGLE_WEIGHT
Sissy Squat,SINGLE_WEIGHT
Reverse Dumbbell Fly,WEIGHT_PAIR
Skull Crusher,BARBELL
Lateral Band Walk,SINGLE_WEIGHT`;

function createDefaultExercises() {
  const results = Papa.parse<Pick<Exercise, "name" | "loadKind">>(
    exerciseData,
    {
      header: true,
    },
  );
  const rows = results.data;
  sortRecordsByName(rows);
  return rows;
}

interface ExerciseStore {
  exercises: Pick<Exercise, "name" | "loadKind">[];
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
    },
  ),
);

export default useExerciseStore;
