import type { StateStorage } from "zustand/middleware";
import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  Activity,
  Equipment,
  Exercise,
  Program,
  Session,
  WorkoutSet,
} from "@activity-log/ui/utils";
import { dateRegex, exerciseNamesMatch } from "@activity-log/ui/utils";

export interface WorkoutStore {
  programs: Program[];
  exercises: Exercise[];
  equipment: Equipment;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  addProgram: (program: Program) => void;
  updateProgram: (program: Program) => void;
  deleteProgram: (programId: string) => void;
  addSession: (programId: string, session: Session) => void;
  updateSession: (programId: string, session: Session) => void;
  startSession: (programId: string, sessionId: string) => void;
  deleteSession: (programId: string, sessionId: string) => void;
  addActivity: (
    programId: string,
    sessionId: string,
    activity: Activity,
  ) => void;
  updateActivity: (
    programId: string,
    sessionId: string,
    activity: Activity,
  ) => void;
  deleteActivity: (
    programId: string,
    sessionId: string,
    activityId: string,
  ) => void;
  addExercise: (exercise: Exercise) => void;
  updateExercise: (exercise: Exercise) => void;
  deleteExercise: (exerciseId: string) => void;
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet,
  ) => void;
  updateEquipment: (equipment: Equipment) => void;
  resetWorkoutStore: () => void;
}

type WorkoutStoreData = Pick<
  WorkoutStore,
  "programs" | "exercises" | "equipment"
>;

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

const normalizeEquipment = (equipment: Partial<Equipment> = {}): Equipment => ({
  barbells: equipment.barbells ?? [],
  plates: equipment.plates ?? [],
});

const createDefaultWorkoutStoreData = (): WorkoutStoreData => ({
  programs: [],
  exercises: [],
  equipment: createDefaultEquipment(),
});

const reviveDates = (key: string, value: unknown): unknown =>
  (key === "start" || key === "end") &&
  typeof value === "string" &&
  dateRegex.exec(value)
    ? new Date(value)
    : value;

interface LocalStorageLike {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

const getLocalStorage = (): LocalStorageLike =>
  (globalThis as typeof globalThis & { localStorage: LocalStorageLike })
    .localStorage;

const createWorkoutStorage = (): StateStorage<void> => {
  const storage = getLocalStorage();

  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      storage.setItem(name, value);
    },
    removeItem: (name) => {
      storage.removeItem(name);
    },
  };
};

const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      ...createDefaultWorkoutStoreData(),
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
      addProgram: (program: Program) => {
        set(
          produce((state: WorkoutStore) => {
            state.programs.push(program);
          }),
        );
      },
      updateProgram: (program: Program) => {
        set(
          produce((state: WorkoutStore) => {
            const current = state.programs.find(
              (el) => el.programId === program.programId,
            );
            if (!current) throw new Error("Program not found");
            current.name = program.name.trim();
            current.sessions = program.sessions;
          }),
        );
      },
      deleteProgram: (programId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const idx = state.programs.findIndex(
              (el) => el.programId === programId,
            );
            if (idx === -1) throw new Error("Program not found");
            state.programs.splice(idx, 1);
          }),
        );
      },
      addSession: (programId: string, session: Session) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            program?.sessions.push(session);
          }),
        );
      },
      updateSession: (programId: string, session: Session) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            const current = program?.sessions.find(
              (el) => el.sessionId === session.sessionId,
            );
            if (!current) throw new Error("Session not found");
            current.name = session.name.trim();
            current.templateId = session.templateId;
            current.start = session.start;
            current.end = session.end;
            current.activities = session.activities;
            current.status = session.status;
          }),
        );
      },
      startSession: (programId: string, sessionId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            if (!program) throw new Error("Program not found");
            const session = program.sessions.find(
              (el) => el.sessionId === sessionId,
            );
            if (!session) throw new Error("Session not found");
            if (session.status !== "Planned")
              throw new Error(
                `Session already started: ${session.name} (${session.sessionId}, ${session.status})`,
              );
            session.start = new Date();
            session.status = "Ready";
          }),
        );
      },
      deleteSession: (programId: string, sessionId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            if (!program) throw new Error("Program not found");
            const idx = program.sessions.findIndex(
              (el) => el.sessionId === sessionId,
            );
            if (idx === -1) throw new Error("Session not found");
            program.sessions.splice(idx, 1);
          }),
        );
      },
      addActivity: (
        programId: string,
        sessionId: string,
        activity: Activity,
      ) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            if (!program) throw new Error("Program not found");
            const session = program.sessions.find(
              (el) => el.sessionId === sessionId,
            );
            if (!session) throw new Error("Session not found");
            session.activities.push(activity);
          }),
        );
      },
      updateActivity: (
        programId: string,
        sessionId: string,
        activity: Activity,
      ) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            if (!program) throw new Error("Program not found");
            const session = program.sessions.find(
              (el) => el.sessionId === sessionId,
            );
            if (!session) throw new Error("Session not found");
            const current = session.activities.find(
              (el) => el.activityId === activity.activityId,
            );
            if (!current) throw new Error("Activity not found");
            current.warmupSets = activity.warmupSets;
            current.mainSets = activity.mainSets;
            current.load = activity.load;
            current.exerciseId = activity.exerciseId;
            current.rest = activity.rest;
            current.reps = activity.reps;
          }),
        );
      },
      deleteActivity: (
        programId: string,
        sessionId: string,
        activityId: string,
      ) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            if (!program) throw new Error("Program not found");
            const session = program.sessions.find(
              (el) => el.sessionId === sessionId,
            );
            if (!session) throw new Error("Session not found");
            const idx = session.activities.findIndex(
              (el) => el.activityId === activityId,
            );
            if (idx === -1) throw new Error("Activity not found");
            session.activities.splice(idx, 1);
          }),
        );
      },
      addExercise: (exercise: Exercise) => {
        set(
          produce((state: WorkoutStore) => {
            if (
              state.exercises.some((el) =>
                exerciseNamesMatch(el.name, exercise.name),
              )
            ) {
              throw new Error("Exercise name already exists");
            }
            state.exercises.push({
              ...exercise,
              name: exercise.name.trim(),
              primaryMuscle: exercise.primaryMuscle?.trim(),
            });
          }),
        );
      },
      updateExercise: (exercise: Exercise) => {
        set(
          produce((state: WorkoutStore) => {
            const current = state.exercises.find(
              (el) => el.exerciseId === exercise.exerciseId,
            );
            if (!current) throw new Error("Exercise not found");
            if (
              state.exercises.some(
                (el) =>
                  el.exerciseId !== exercise.exerciseId &&
                  exerciseNamesMatch(el.name, exercise.name),
              )
            ) {
              throw new Error("Exercise name already exists");
            }
            current.name = exercise.name.trim();
            current.loadKind = exercise.loadKind;
            current.barbellId = exercise.barbellId;
            current.oneRepMax = exercise.oneRepMax;
            current.primaryMuscle = exercise.primaryMuscle?.trim();
            current.notes = exercise.notes;
          }),
        );
      },
      deleteExercise: (exerciseId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const idx = state.exercises.findIndex(
              (el) => el.exerciseId === exerciseId,
            );
            if (idx === -1) throw new Error("Exercise not found");
            state.exercises.splice(idx, 1);
          }),
        );
      },
      updateWorkoutSet: (
        programId: string,
        sessionId: string,
        activityId: string,
        workoutSet: WorkoutSet,
      ) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (el) => el.programId === programId,
            );
            if (!program) throw new Error("Program not found");
            const session = program.sessions.find(
              (el) => el.sessionId === sessionId,
            );
            if (!session) throw new Error("Session not found");
            const activity = session.activities.find(
              (el) => el.activityId === activityId,
            );
            if (!activity) throw new Error("Activity not found");
            const current =
              activity.mainSets.find(
                (el) => el.workoutSetId === workoutSet.workoutSetId,
              ) ??
              activity.warmupSets.find(
                (el) => el.workoutSetId === workoutSet.workoutSetId,
              );
            if (!current) throw new Error("WorkoutSet not found");
            current.actualReps = workoutSet.actualReps;
            current.weight = workoutSet.weight;
            current.end = workoutSet.end;
            current.start = workoutSet.start;
            current.status = workoutSet.status;
            current.feedback = workoutSet.feedback;
          }),
        );
      },
      updateEquipment: (equipment: Equipment) => {
        set(
          produce((state: WorkoutStore) => {
            state.equipment = normalizeEquipment(equipment);
          }),
        );
      },
      resetWorkoutStore: () => {
        set(
          produce((state: WorkoutStore) => {
            Object.assign(state, createDefaultWorkoutStoreData());
          }),
        );
      },
    }),
    {
      name: "workout-storage",
      onRehydrateStorage: () => (state?: WorkoutStore) => {
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<WorkoutStoreData>;

        return {
          ...currentState,
          ...persisted,
          equipment: normalizeEquipment(
            persisted.equipment ?? currentState.equipment,
          ),
        };
      },
      storage: createJSONStorage(createWorkoutStorage, {
        reviver: reviveDates,
      }),
    },
  ),
);

export default useWorkoutStore;
