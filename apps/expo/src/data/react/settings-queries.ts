import { useIsFocused } from "expo-router/react-navigation";
import { useQuery } from "@tanstack/react-query";

import type { ApplicationMemory } from "../application-memory";
import type { ApplicationDataRuntime } from "./application-data";
import { getMemoryExercise } from "../application-memory";
import { workoutKeys } from "../cache/keys";
import { useApplicationDataSnapshot } from "./application-data";

function savedExercises(memory: ApplicationMemory) {
  return memory.data.exercises.map((exercise) => {
    const revision = memory.exerciseRevisions.get(exercise.id);
    if (revision === undefined)
      throw new Error("The exercise revision is missing.");
    return { ...exercise, revision };
  });
}

function current(runtime: ApplicationDataRuntime, generation: number) {
  const snapshot = runtime.getSnapshot();
  if (snapshot.generation !== generation)
    throw new Error("The workout dataset has changed.");
  return snapshot;
}

function memoryEquipment(memory: ApplicationMemory) {
  return {
    barbells: memory.data.equipment.barbells.map(({ id, ...item }) => ({
      ...item,
      barbellId: id,
    })),
    plates: memory.data.equipment.plates.map(({ id, ...item }) => ({
      ...item,
      plateId: id,
    })),
  };
}

export function useEquipment(runtime: ApplicationDataRuntime) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.equipment(generation),
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve(memoryEquipment(latest.memory))
        : latest.service.equipment();
    },
    initialData: () => (memory ? memoryEquipment(memory) : undefined),
    enabled: focused,
    retryOnMount: false,
  });
}
export function useMuscleCatalog(runtime: ApplicationDataRuntime) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.muscles(generation),
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve([...latest.memory.data.muscleGroups])
        : latest.service.listMuscles();
    },
    initialData: () => memory?.data.muscleGroups,
    enabled: focused,
    retryOnMount: false,
  });
}
export function useExerciseCatalog(runtime: ApplicationDataRuntime) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.exerciseCatalog(generation),
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve(savedExercises(latest.memory))
        : latest.service.listExercises();
    },
    initialData: () => (memory ? savedExercises(memory) : undefined),
    enabled: focused,
    retryOnMount: false,
  });
}
export function useExerciseLibrary(runtime: ApplicationDataRuntime) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: [...workoutKeys.exerciseCatalog(generation), "library"],
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve({
            saved: savedExercises(latest.memory),
            presets: latest.memory.data.presets,
          })
        : latest.service.exerciseLibrary();
    },
    initialData: () =>
      memory
        ? { saved: savedExercises(memory), presets: memory.data.presets }
        : undefined,
    enabled: focused,
    retryOnMount: false,
  });
}
export function useExercisePresets(runtime: ApplicationDataRuntime) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.exercisePresets(generation),
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve([...latest.memory.data.presets])
        : latest.service.listExercisePresets();
    },
    initialData: () => memory?.data.presets,
    enabled: focused,
    retryOnMount: false,
  });
}
export function useExerciseDetail(
  runtime: ApplicationDataRuntime,
  id: string | undefined,
) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.exerciseDetail(generation, id ?? ""),
    queryFn: () => {
      const latest = current(runtime, generation);
      return !id
        ? Promise.resolve(null)
        : latest.memory
          ? Promise.resolve(getMemoryExercise(latest.memory, id))
          : latest.service.exercise(id);
    },
    initialData: () => {
      if (!memory || !id) return undefined;
      return getMemoryExercise(memory, id);
    },
    enabled: focused && id !== undefined,
    retryOnMount: false,
  });
}
export function useExerciseUsage(
  runtime: ApplicationDataRuntime,
  id: string | undefined,
) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.exerciseUsage(generation, id ?? ""),
    queryFn: () => {
      const latest = current(runtime, generation);
      return !id
        ? Promise.resolve(false)
        : latest.memory
          ? Promise.resolve(
              [...latest.memory.activities.values()].some(
                (activity) => activity.exerciseId === id,
              ),
            )
          : latest.service.exerciseUsed(id);
    },
    initialData: () =>
      memory && id
        ? [...memory.activities.values()].some(
            (activity) => activity.exerciseId === id,
          )
        : undefined,
    enabled: focused && id !== undefined,
    retryOnMount: false,
  });
}
