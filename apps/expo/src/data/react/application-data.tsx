import type { PropsWithChildren } from "react";
import {
  createContext,
  Fragment,
  use,
  useEffect,
  useSyncExternalStore,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import type { createApplicationDataRuntime } from "../application-runtime";
import { useSelectionHandoff } from "./selection-handoff";

export type ApplicationDataRuntime = Awaited<
  ReturnType<typeof createApplicationDataRuntime>
>;
const RuntimeContext = createContext<ApplicationDataRuntime | null>(null);

/** Provide the active application data runtime and its query cache. */
export function ApplicationDataProvider({
  runtime,
  children,
}: PropsWithChildren<{ runtime: ApplicationDataRuntime }>) {
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  useEffect(() => {
    useSelectionHandoff.getState().clearOtherGenerations(snapshot.generation);
  }, [snapshot.generation]);
  return (
    <RuntimeContext value={runtime}>
      <QueryClientProvider client={runtime.cache}>
        <Fragment key={snapshot.generation}>{children}</Fragment>
      </QueryClientProvider>
    </RuntimeContext>
  );
}

export function useApplicationDataRuntime() {
  const runtime = use(RuntimeContext);
  if (!runtime) throw new Error("The workout data runtime is unavailable.");
  return runtime;
}

export function useApplicationDataSnapshot(runtime: ApplicationDataRuntime) {
  return useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
}
