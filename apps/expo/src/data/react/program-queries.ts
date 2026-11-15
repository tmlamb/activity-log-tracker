import { useIsFocused } from "expo-router/react-navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { ApplicationDataRuntime } from "./application-data";
import {
  getMemoryProgramOverview,
  getMemoryPrograms,
  getMemoryProgramWeek,
} from "../application-memory";
import { workoutKeys } from "../cache/keys";
import { useApplicationDataSnapshot } from "./application-data";
import { programWeekQueryOptions } from "./program-week-options";

export { programWeekQueryOptions } from "./program-week-options";

function current(runtime: ApplicationDataRuntime, generation: number) {
  const snapshot = runtime.getSnapshot();
  if (snapshot.generation !== generation)
    throw new Error("The workout dataset has changed.");
  return snapshot;
}

export function useProgramSummaries(runtime: ApplicationDataRuntime) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.programs(generation),
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve(getMemoryPrograms(latest.memory))
        : latest.service.listPrograms();
    },
    initialData: () => (memory ? getMemoryPrograms(memory) : undefined),
    enabled: focused,
    retryOnMount: false,
  });
}

export function useProgramHeader(
  runtime: ApplicationDataRuntime,
  programId: string | undefined,
) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.programHeader(generation, programId ?? ""),
    queryFn: () => {
      if (!programId) return Promise.resolve(null);
      const latest = current(runtime, generation);
      if (!latest.memory) return latest.service.programHeader(programId);
      const program = latest.memory.programs.get(programId);
      return Promise.resolve(
        program ? { id: program.id, name: program.name } : null,
      );
    },
    initialData: () => {
      if (!memory || !programId) return undefined;
      const program = memory.programs.get(programId);
      return program ? { id: program.id, name: program.name } : null;
    },
    enabled: focused && programId !== undefined,
    retryOnMount: false,
  });
}

export function useProgramOverview(
  runtime: ApplicationDataRuntime,
  programId: string,
) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: [...workoutKeys.timeline(generation, programId), "overview"],
    queryFn: () => {
      const latest = current(runtime, generation);
      return latest.memory
        ? Promise.resolve(
            getMemoryProgramOverview(latest.memory, programId, Date.now()),
          )
        : latest.service.programOverview(programId);
    },
    initialData: () =>
      memory
        ? getMemoryProgramOverview(memory, programId, Date.now())
        : undefined,
    enabled: focused,
    retryOnMount: false,
  });
}

export function useProgramWeek(
  runtime: ApplicationDataRuntime,
  programId: string,
  week: number,
  programStartMs: number,
  currentWeek: number,
  expanded: boolean,
) {
  const snapshot = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useInfiniteQuery({
    ...programWeekQueryOptions(
      snapshot,
      programId,
      week,
      programStartMs,
      currentWeek,
    ),
    queryFn: async ({ pageParam }) => {
      const latest = current(runtime, snapshot.generation);
      if (latest.memory) {
        const page = getMemoryProgramWeek(
          latest.memory,
          programId,
          week,
          programStartMs,
          currentWeek,
          Date.now(),
        );
        if (!page) throw new Error("The program is no longer available.");
        return page;
      }
      const page = await latest.service.programWeek(programId, {
        week,
        after: pageParam,
        limit: 50,
      });
      if (!page) throw new Error("The program is no longer available.");
      return page;
    },
    enabled: focused && expanded,
    initialData: () => {
      if (!snapshot.memory) return undefined;
      const page = getMemoryProgramWeek(
        snapshot.memory,
        programId,
        week,
        programStartMs,
        currentWeek,
        Date.now(),
      );
      return page ? { pages: [page], pageParams: [undefined] } : undefined;
    },
  });
}
