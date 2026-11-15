import { useIsFocused } from "expo-router/react-navigation";
import { useQuery } from "@tanstack/react-query";

import type { SetReference } from "../repositories/sets";
import type { ApplicationDataRuntime } from "./application-data";
import {
  getMemoryDeloadFacts,
  getMemorySessionEditorSeed,
  getMemorySetContext,
} from "../application-memory";
import { workoutKeys } from "../cache/keys";
import { calculateDeloadCandidate } from "../domain/deload-candidate";
import { useApplicationDataSnapshot } from "./application-data";

export function useSessionEditorSeed(
  runtime: ApplicationDataRuntime,
  programId: string,
  sessionId: string | null,
) {
  const snapshot = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.sessionEditorSeed(
      snapshot.generation,
      programId,
      sessionId,
    ),
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== snapshot.generation)
        throw new Error("The workout dataset has changed.");
      return latest.memory
        ? Promise.resolve(
            getMemorySessionEditorSeed(latest.memory, programId, sessionId),
          )
        : latest.service.sessionEditorSeed(programId, sessionId);
    },
    initialData: () =>
      snapshot.memory
        ? getMemorySessionEditorSeed(snapshot.memory, programId, sessionId)
        : undefined,
    enabled: focused,
    retryOnMount: false,
  });
}

export function useSessionDetail(
  runtime: ApplicationDataRuntime,
  programId: string,
  sessionId: string,
) {
  const snapshot = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.sessionDetail(
      snapshot.generation,
      programId,
      sessionId,
    ),
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== snapshot.generation)
        throw new Error("The workout dataset has changed.");
      return latest.memory
        ? Promise.resolve(
            getMemorySessionEditorSeed(latest.memory, programId, sessionId)
              ?.session ?? null,
          )
        : latest.service.sessionDetail(programId, sessionId);
    },
    initialData: () =>
      snapshot.memory
        ? (getMemorySessionEditorSeed(snapshot.memory, programId, sessionId)
            ?.session ?? null)
        : undefined,
    enabled: focused,
    retryOnMount: false,
  });
}

export function useSessionDeloadCandidate(
  runtime: ApplicationDataRuntime,
  programId: string,
  sessionId: string,
  enabled: boolean,
) {
  const snapshot = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: workoutKeys.deloadCandidate(
      snapshot.generation,
      programId,
      sessionId,
    ),
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== snapshot.generation)
        throw new Error("The workout dataset has changed.");
      if (!latest.memory)
        return latest.service.sessionDeloadCandidate(programId, sessionId);
      const facts = getMemoryDeloadFacts(latest.memory, programId, sessionId);
      return Promise.resolve(facts ? calculateDeloadCandidate(facts) : null);
    },
    initialData: () => {
      if (!snapshot.memory) return undefined;
      const facts = getMemoryDeloadFacts(snapshot.memory, programId, sessionId);
      return facts ? calculateDeloadCandidate(facts) : null;
    },
    enabled: focused && enabled,
    retryOnMount: false,
  });
}

export function useSetContext(
  runtime: ApplicationDataRuntime,
  reference: SetReference,
) {
  const snapshot = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  return useQuery({
    queryKey: [
      ...workoutKeys.setContexts(
        snapshot.generation,
        reference.programId,
        reference.sessionId,
      ),
      reference.activityId,
      reference.setId,
    ],
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== snapshot.generation)
        throw new Error("The workout dataset has changed.");
      return latest.memory
        ? Promise.resolve(getMemorySetContext(latest.memory, reference))
        : latest.service.setContext(reference);
    },
    initialData: () =>
      snapshot.memory
        ? getMemorySetContext(snapshot.memory, reference)
        : undefined,
    enabled: focused,
    retryOnMount: false,
  });
}
