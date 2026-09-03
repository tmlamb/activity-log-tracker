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
import {
  cleanupInactiveSession,
  dateRegex,
  exerciseNamesMatch,
  completeSession as finalizeSession,
  isSessionTerminalStatus,
  normalizeExerciseName,
  normalizeMuscleGroups,
  normalizeSingleLineText,
  reconcileCompletedWorkoutSet as reconcileWorkoutSet,
} from "@activity-log/ui/utils";

import {
  createDefaultExercises,
  createDefaultMuscleGroups,
} from "./use-exercise-store";

export interface WorkoutStore {
  programs: Program[];
  exercises: Exercise[];
  equipment: Equipment;
  muscleGroups: string[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  addProgram: (program: Program) => void;
  updateProgram: (program: Program) => void;
  deleteProgram: (programId: string) => void;
  addSession: (programId: string, session: Session) => void;
  updateSession: (programId: string, session: Session) => void;
  completeSession: (programId: string, session: Session) => void;
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
  restoreExercise: (exercise: Exercise) => void;
  deleteExercise: (exerciseId: string) => void;
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet,
  ) => void;
  reconcileCompletedWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSetId: string,
    actualReps: number | undefined,
  ) => void;
  cleanupInactiveSessions: (now?: Date) => void;
  updateEquipment: (equipment: Equipment) => void;
  updateMuscleGroups: (muscleGroups: string[]) => void;
  resetWorkoutStore: () => void;
}

type WorkoutStoreData = Pick<
  WorkoutStore,
  "programs" | "exercises" | "equipment" | "muscleGroups"
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

const normalizeExerciseMuscles = (exercise: Exercise): Exercise => {
  const legacyExercise = exercise as Exercise & { primaryMuscle?: string };
  const primaryMuscles = exercise.primaryMuscles ?? [
    legacyExercise.primaryMuscle,
  ];

  return {
    ...exercise,
    primaryMuscles: normalizeMuscleGroups(primaryMuscles),
  };
};

const migrateSavedExerciseMuscles = (exercises: Exercise[]) => {
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

const createDefaultWorkoutStoreData = (): WorkoutStoreData => ({
  programs: [],
  exercises: [],
  equipment: createDefaultEquipment(),
  muscleGroups: createDefaultMuscleGroups(),
});

const normalizeMuscleCatalog = (muscleGroups: readonly unknown[]) =>
  normalizeMuscleGroups(muscleGroups).sort((a, b) => a.localeCompare(b));

const reviveDates = (key: string, value: unknown): unknown =>
  (key === "start" || key === "end" || key === "lastActivityAt") &&
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
    (set, get) => ({
      ...createDefaultWorkoutStoreData(),
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
      addProgram: (program: Program) => {
        set(
          produce((state: WorkoutStore) => {
            state.programs.push({
              ...program,
              name: normalizeSingleLineText(program.name),
            });
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
            current.name = normalizeSingleLineText(program.name);
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
            program?.sessions.push({
              ...session,
              name: normalizeSingleLineText(session.name),
              lastActivityAt: new Date(),
            });
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
            const now = new Date();
            const status =
              current.status === "Done" && session.status !== "Planned"
                ? "Done"
                : current.status === "Incomplete" && session.status === "Ready"
                  ? "Incomplete"
                  : session.status;
            const end = isSessionTerminalStatus(status)
              ? (session.end ?? current.end ?? now)
              : session.end;
            const hasNonterminalSets = session.activities.some((activity) =>
              [...activity.warmupSets, ...activity.mainSets].some(
                (workoutSet) =>
                  workoutSet.status === "Planned" ||
                  workoutSet.status === "Ready",
              ),
            );
            const activities =
              isSessionTerminalStatus(current.status) &&
              isSessionTerminalStatus(status) &&
              hasNonterminalSets
                ? current.activities
                : session.activities;
            const nextSession =
              !isSessionTerminalStatus(current.status) && status === "Done"
                ? finalizeSession({ ...session, status }, end ?? now)
                : { ...session, activities, end, status };
            current.name = normalizeSingleLineText(nextSession.name);
            current.templateId = nextSession.templateId;
            current.start = nextSession.start;
            current.end = nextSession.end;
            current.activities = nextSession.activities;
            current.status = nextSession.status;
            current.lastActivityAt = now;
          }),
        );
      },
      completeSession: (programId: string, session: Session) => {
        const current = get()
          .programs.find((program) => program.programId === programId)
          ?.sessions.find((item) => item.sessionId === session.sessionId);
        if (current?.status !== "Ready" && current?.status !== "Incomplete") {
          return;
        }

        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(
              (item) => item.programId === programId,
            );
            const currentSession = program?.sessions.find(
              (item) => item.sessionId === session.sessionId,
            );
            if (
              currentSession?.status !== "Ready" &&
              currentSession?.status !== "Incomplete"
            ) {
              return;
            }

            const now = new Date();
            const isAcknowledgingTimeout =
              currentSession.status === "Incomplete";
            const completedSession = finalizeSession(
              isAcknowledgingTimeout
                ? { ...currentSession }
                : { ...session, start: currentSession.start },
              isAcknowledgingTimeout
                ? (currentSession.end ?? now)
                : (session.end ?? now),
            );
            currentSession.name = normalizeSingleLineText(
              completedSession.name,
            );
            currentSession.templateId = completedSession.templateId;
            currentSession.start = completedSession.start;
            currentSession.end = completedSession.end;
            currentSession.activities = completedSession.activities;
            currentSession.status = completedSession.status;
            currentSession.lastActivityAt = now;
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
            const now = new Date();
            session.start = now;
            session.lastActivityAt = now;
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
            session.lastActivityAt = new Date();
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
            session.lastActivityAt = new Date();
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
            session.lastActivityAt = new Date();
          }),
        );
      },
      addExercise: (exercise: Exercise) => {
        set(
          produce((state: WorkoutStore) => {
            if (
              state.exercises.some(
                (el) =>
                  !el.deleted && exerciseNamesMatch(el.name, exercise.name),
              )
            ) {
              throw new Error("Exercise name already exists");
            }
            state.exercises.push({
              ...normalizeExerciseMuscles(exercise),
              name: normalizeSingleLineText(exercise.name),
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
              !current.deleted &&
              state.exercises.some(
                (el) =>
                  el.exerciseId !== exercise.exerciseId &&
                  !el.deleted &&
                  exerciseNamesMatch(el.name, exercise.name),
              )
            ) {
              throw new Error("Exercise name already exists");
            }
            current.name = normalizeSingleLineText(exercise.name);
            current.loadKind = exercise.loadKind;
            current.barbellId = exercise.barbellId;
            current.oneRepMax = exercise.oneRepMax;
            current.primaryMuscles = exercise.primaryMuscles;
            current.notes = exercise.notes;
          }),
        );
      },
      restoreExercise: (exercise: Exercise) => {
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
                  !el.deleted &&
                  exerciseNamesMatch(el.name, exercise.name),
              )
            ) {
              throw new Error("Exercise name already exists");
            }

            current.name = normalizeSingleLineText(exercise.name);
            current.loadKind = exercise.loadKind;
            current.barbellId = exercise.barbellId;
            current.oneRepMax = exercise.oneRepMax;
            current.primaryMuscles = exercise.primaryMuscles;
            current.notes = exercise.notes;
            current.deleted = false;
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
            const exercise = state.exercises[idx];
            if (!exercise) throw new Error("Exercise not found");
            exercise.deleted = true;
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
            const now = new Date();
            current.actualReps = workoutSet.actualReps;
            current.weight = workoutSet.weight;
            current.feedback = workoutSet.feedback;
            if (!isSessionTerminalStatus(session.status)) {
              current.end = workoutSet.end;
              current.start = workoutSet.start;
              current.status = workoutSet.status;
            }
            session.lastActivityAt = now;
          }),
        );
      },
      reconcileCompletedWorkoutSet: (
        programId: string,
        sessionId: string,
        activityId: string,
        workoutSetId: string,
        actualReps: number | undefined,
      ) => {
        const session = get()
          .programs.find((program) => program.programId === programId)
          ?.sessions.find((item) => item.sessionId === sessionId);
        const activity = session?.activities.find(
          (item) => item.activityId === activityId,
        );
        const workoutSet = [
          ...(activity?.warmupSets ?? []),
          ...(activity?.mainSets ?? []),
        ].find((item) => item.workoutSetId === workoutSetId);
        const status = (actualReps ?? 0) > 0 ? "Done" : "Incomplete";
        if (
          !session ||
          !isSessionTerminalStatus(session.status) ||
          !workoutSet ||
          (Object.is(workoutSet.actualReps, actualReps) &&
            workoutSet.status === status)
        ) {
          return;
        }

        set(
          produce((state: WorkoutStore) => {
            const currentSession = state.programs
              .find((program) => program.programId === programId)
              ?.sessions.find((item) => item.sessionId === sessionId);
            const currentActivity = currentSession?.activities.find(
              (item) => item.activityId === activityId,
            );
            const currentWorkoutSet = [
              ...(currentActivity?.warmupSets ?? []),
              ...(currentActivity?.mainSets ?? []),
            ].find((item) => item.workoutSetId === workoutSetId);
            if (
              !currentSession ||
              !isSessionTerminalStatus(currentSession.status) ||
              !currentWorkoutSet
            ) {
              return;
            }

            const now = new Date();
            const end = currentSession.end ?? now;
            Object.assign(
              currentWorkoutSet,
              reconcileWorkoutSet(currentWorkoutSet, actualReps, end),
            );
            currentSession.end ??= end;
            currentSession.lastActivityAt = now;
          }),
        );
      },
      cleanupInactiveSessions: (now = new Date()) => {
        const state = get();
        const programs = state.programs.map((program) => {
          const sessions = program.sessions.map((session) =>
            cleanupInactiveSession(session, now),
          );
          const changed = sessions.some(
            (session, index) => session !== program.sessions[index],
          );

          return changed ? { ...program, sessions } : program;
        });
        const changed = programs.some(
          (program, index) => program !== state.programs[index],
        );

        if (changed) {
          set({ programs });
        }
      },
      updateEquipment: (equipment: Equipment) => {
        set(
          produce((state: WorkoutStore) => {
            state.equipment = normalizeEquipment(equipment);
          }),
        );
      },
      updateMuscleGroups: (muscleGroups: string[]) => {
        const nextMuscleGroups = normalizeMuscleCatalog(muscleGroups);

        set(
          produce((state: WorkoutStore) => {
            state.muscleGroups = nextMuscleGroups;
            state.exercises.forEach((exercise) => {
              exercise.primaryMuscles = exercise.primaryMuscles?.filter(
                (item) => nextMuscleGroups.includes(item),
              );
            });
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
      version: 1,
      migrate: (persistedState, version) => {
        if (version >= 1) return persistedState;

        const persisted = (persistedState ?? {}) as Partial<WorkoutStoreData>;

        return {
          ...persisted,
          exercises: persisted.exercises
            ? migrateSavedExerciseMuscles(persisted.exercises)
            : undefined,
        };
      },
      onRehydrateStorage: () => (state?: WorkoutStore) => {
        state?.cleanupInactiveSessions();
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<WorkoutStoreData>;
        const exercises = (persisted.exercises ?? currentState.exercises).map(
          normalizeExerciseMuscles,
        );

        return {
          ...currentState,
          ...persisted,
          exercises,
          equipment: normalizeEquipment(
            persisted.equipment ?? currentState.equipment,
          ),
          muscleGroups: normalizeMuscleCatalog([
            ...(persisted.muscleGroups ?? currentState.muscleGroups),
            ...exercises.flatMap((exercise) => exercise.primaryMuscles ?? []),
          ]),
        };
      },
      storage: createJSONStorage(createWorkoutStorage, {
        reviver: reviveDates,
      }),
    },
  ),
);

export default useWorkoutStore;
