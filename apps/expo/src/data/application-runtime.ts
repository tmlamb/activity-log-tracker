import type { ApplicationMemory } from "./application-memory";
import type { prepareApplicationRestore } from "./backup/prepare-restore";
import type { openApplicationDatabase } from "./database/connections";
import {
  applyMemoryChange,
  buildApplicationMemory,
  readApplicationMemoryFacts,
} from "./application-memory";
import { publishMemoryToCache } from "./cache/memory-publication";
import { createWorkoutQueryClient } from "./cache/query-client";
import { createWorkoutService } from "./workout-service";

type Database = Awaited<ReturnType<typeof openApplicationDatabase>>;
type InternalService = ReturnType<typeof createWorkoutService>;
type Service = Omit<
  InternalService,
  | "resetApplicationData"
  | "restoreVersion1"
  | "restoreVersion2"
  | "restoreApplicationData"
>;
export interface ApplicationDataSnapshot {
  generation: number;
  service: Service;
  memory: ApplicationMemory | null;
}

/**
 * Own the verified database, cache and service for one application lifetime.
 * Callers must gate routes until this resolves and await resume before exposing
 * foreground workout data. Dataset replacements publish a new service only
 * after the transaction commits and old cache entries have been discarded.
 */
export async function createApplicationDataRuntime(options: {
  open: () => Promise<Database>;
  onCacheError: (error: unknown) => void;
  now?: () => number;
}) {
  const database = await options.open();
  const cache = createWorkoutQueryClient();
  const now = options.now ?? Date.now;
  try {
    const state = await database.read((transaction) =>
      transaction.getFirstAsync<{
        state: string;
        generation: number;
      }>("SELECT state, generation FROM bootstrap_state WHERE singleton = 1"),
    );
    if (
      state?.state !== "ready" ||
      !Number.isSafeInteger(state.generation) ||
      state.generation < 0
    )
      throw new Error("The workout database is not ready.");
    const listeners = new Set<() => void>();
    let snapshot: ApplicationDataSnapshot;
    let closing = false;
    let hydrating = true;
    let memoryEpoch = 0;
    let recovery: Promise<void> | undefined;
    let replacement: Promise<number> | undefined;
    let closePromise: Promise<void> | undefined;
    const isClosing = () => closing;
    function notify() {
      for (const listener of listeners) {
        try {
          listener();
        } catch (error) {
          try {
            options.onCacheError(error);
          } catch {
            /* A listener cannot undo a commit. */
          }
        }
      }
    }
    function recoverMemory(generation: number) {
      if (hydrating || recovery || isClosing()) return;
      const task = (async () => {
        while (
          !isClosing() &&
          snapshot.generation === generation &&
          snapshot.memory === null
        ) {
          const epoch = memoryEpoch;
          const facts = await database.read(async (transaction) => {
            const state = await transaction.getFirstAsync<{
              generation: number;
              state: string;
            }>(
              "SELECT generation, state FROM bootstrap_state WHERE singleton = 1",
            );
            if (state?.state !== "ready" || state.generation !== generation)
              throw new Error("The workout dataset has changed.");
            return readApplicationMemoryFacts(transaction);
          });
          if (epoch !== memoryEpoch) continue;
          if (isClosing() || snapshot.generation !== generation) return;
          snapshot = {
            ...snapshot,
            memory: buildApplicationMemory(facts, generation),
          };
          notify();
        }
      })();
      recovery = task;
      void task.then(
        () => {
          recovery = undefined;
        },
        (error: unknown) => {
          recovery = undefined;
          try {
            options.onCacheError(error);
          } catch {
            /* Reporting cannot undo committed data. */
          }
        },
      );
    }
    const makeService = (generation: number) =>
      createWorkoutService(
        database,
        cache,
        generation,
        options.onCacheError,
        now,
        (change, memoryChange) => {
          if (snapshot.generation !== generation) return;
          memoryEpoch++;
          if (snapshot.memory === null) {
            recoverMemory(generation);
            return;
          }
          try {
            if (
              memoryChange &&
              applyMemoryChange(snapshot.memory, memoryChange)
            ) {
              publishMemoryToCache(cache, snapshot.memory, change, now());
              snapshot = { ...snapshot, memory: { ...snapshot.memory } };
            } else {
              snapshot = { ...snapshot, memory: null };
              recoverMemory(generation);
            }
            notify();
          } catch (error) {
            snapshot = { ...snapshot, memory: null };
            notify();
            recoverMemory(generation);
            throw error;
          }
        },
      );
    let activeService = makeService(state.generation);
    snapshot = {
      generation: state.generation,
      service: activeService,
      memory: null,
    };
    // Conversion equivalence and external receipt are established by open().
    // Maintenance is deliberately separate from conversion verification.
    await snapshot.service.cleanupInactiveSessions();
    const initialFacts = await database.read(readApplicationMemoryFacts);
    snapshot = {
      ...snapshot,
      memory: buildApplicationMemory(initialFacts, state.generation),
    };
    hydrating = false;

    function replace(
      job: (service: InternalService) => Promise<number>,
    ): Promise<number> {
      if (closing)
        return Promise.reject(
          new Error("The workout data runtime is closing."),
        );
      if (replacement)
        return Promise.reject(
          new Error("A dataset replacement is already in progress."),
        );
      const pending = (async () => {
        const generation = await job(activeService);
        activeService = makeService(generation);
        snapshot = { generation, service: activeService, memory: null };
        try {
          const facts = await database.read(readApplicationMemoryFacts);
          snapshot = {
            ...snapshot,
            memory: buildApplicationMemory(facts, generation),
          };
        } catch (error) {
          try {
            options.onCacheError(error);
          } catch {
            /* A committed replacement remains active. */
          }
          recoverMemory(generation);
        }
        if (!isClosing()) notify();
        return generation;
      })();
      replacement = pending;
      void pending.then(
        () => {
          replacement = undefined;
        },
        () => {
          replacement = undefined;
        },
      );
      return pending;
    }

    return {
      cache,
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      resume: async () => {
        if (isClosing())
          throw new Error("The workout data runtime is closing.");
        if (replacement) await replacement;
        if (isClosing())
          throw new Error("The workout data runtime is closing.");
        await activeService.cleanupInactiveSessions();
      },
      reset: () => replace((service) => service.resetApplicationData()),
      restore: (prepared: ReturnType<typeof prepareApplicationRestore>) =>
        replace((service) => service.restoreApplicationData(prepared)),
      close: () => {
        if (closePromise) return closePromise;
        closing = true;
        closePromise = (async () => {
          if (replacement) await replacement.catch(() => undefined);
          const results = await Promise.allSettled([
            cache.cancelQueries(),
            database.close(),
          ]);
          cache.clear();
          listeners.clear();
          const errors = results.flatMap((result) =>
            result.status === "rejected" ? [result.reason as unknown] : [],
          );
          if (errors.length)
            throw new AggregateError(
              errors,
              "The workout data runtime could not be closed.",
            );
        })();
        return closePromise;
      },
    };
  } catch (error) {
    cache.clear();
    try {
      await database.close();
    } catch (closeError) {
      throw new AggregateError(
        [error, closeError],
        "The workout data runtime could not start or close cleanly.",
      );
    }
    throw error;
  }
}
