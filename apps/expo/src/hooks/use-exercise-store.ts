import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ExerciseStoreData } from "~/data/legacy/exercise-defaults";
import { createDefaultExercises } from "~/data/legacy/exercise-defaults";

export type { ExerciseStoreData } from "~/data/legacy/exercise-defaults";
export {
  createDefaultExercises,
  createDefaultMuscleGroups,
} from "~/data/legacy/exercise-defaults";

interface ExerciseStore extends ExerciseStoreData {
  replaceExerciseData: (data: ExerciseStoreData) => void;
  resetExercises: () => void;
}

const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set) => ({
      exercises: createDefaultExercises(),
      replaceExerciseData: (data: ExerciseStoreData) => {
        set({ exercises: data.exercises });
      },
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
