import { useIsFocused } from "expo-router/react-navigation";
import { useQuery } from "@tanstack/react-query";

import type { SetReference } from "../repositories/sets";
import type { ApplicationDataRuntime } from "./application-data";
import {
  getMemoryExerciseSeriesFacts,
  getMemoryProgramInsightFacts,
} from "../application-memory";
import { workoutKeys } from "../cache/keys";
import { buildExerciseSeriesProjection } from "../domain/exercise-series";
import { buildProgramInsightProjection } from "../domain/program-insights";
import { useApplicationDataSnapshot } from "./application-data";

export function useProgramInsights(
  runtime: ApplicationDataRuntime,
  programId: string,
) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.programInsights(generation, programId),
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== generation)
        throw new Error("The workout dataset has changed.");
      if (!latest.memory) return latest.service.programInsights(programId);
      const facts = getMemoryProgramInsightFacts(latest.memory, programId);
      return Promise.resolve(
        facts ? buildProgramInsightProjection(facts, Date.now()) : null,
      );
    },
    initialData: () => {
      if (!memory) return undefined;
      const facts = getMemoryProgramInsightFacts(memory, programId);
      return facts ? buildProgramInsightProjection(facts, Date.now()) : null;
    },
    enabled: focused,
    retryOnMount: false,
  });
}

export function useExerciseSeries(
  runtime: ApplicationDataRuntime,
  reference: SetReference,
) {
  const { generation, memory } = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.exerciseSeriesForSet(
      generation,
      reference.programId,
      reference.sessionId,
      reference.activityId,
      reference.setId,
    ),
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== generation)
        throw new Error("The workout dataset has changed.");
      if (!latest.memory) return latest.service.exerciseSeries(reference);
      const facts = getMemoryExerciseSeriesFacts(latest.memory, reference);
      return Promise.resolve(
        facts ? buildExerciseSeriesProjection(facts, Date.now()) : null,
      );
    },
    initialData: () => {
      if (!memory) return undefined;
      const facts = getMemoryExerciseSeriesFacts(memory, reference);
      return facts ? buildExerciseSeriesProjection(facts, Date.now()) : null;
    },
    enabled: focused,
    retryOnMount: false,
  });
}
