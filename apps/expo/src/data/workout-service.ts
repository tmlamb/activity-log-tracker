import type { QueryClient } from "@tanstack/react-query";
import type { SQLiteDatabase } from "expo-sqlite";

import type { WorkoutChange } from "./cache/invalidation";
import type { openApplicationDatabase } from "./database/connections";
import type {
  SetMeasurements,
  SetRecording,
  SetReference,
} from "./repositories/sets";
import { invalidateWorkoutChange } from "./cache/invalidation";
import { workoutKeys } from "./cache/keys";
import {
  createProgram,
  deleteProgram,
  listProgramSummaries,
  renameProgram,
} from "./repositories/programs";
import { getSessionDetail } from "./repositories/session-detail";
import {
  completeSetAndAdvance,
  saveSetRecording,
  startSet,
} from "./repositories/sets";

type Database = Awaited<ReturnType<typeof openApplicationDatabase>>;

/** Data-service lifetime is scoped to one database and dataset generation. */
export function createWorkoutService(
  database: Database,
  cache: QueryClient,
  generation: number,
  onCacheError: (error: unknown) => void,
  now: () => number = Date.now,
) {
  async function assertGeneration(transaction: SQLiteDatabase) {
    const state = await transaction.getFirstAsync<{
      generation: number;
      state: string;
    }>("SELECT generation, state FROM bootstrap_state WHERE singleton = 1");
    if (state?.state !== "ready" || state.generation !== generation) {
      throw new Error("The workout dataset has changed. Reopen this screen.");
    }
  }

  function read<T>(job: (transaction: SQLiteDatabase) => Promise<T>) {
    return database.read(async (transaction) => {
      await assertGeneration(transaction);
      return job(transaction);
    });
  }

  function write<T>(job: (transaction: SQLiteDatabase) => Promise<T>) {
    return database.write(async (transaction) => {
      await assertGeneration(transaction);
      return job(transaction);
    });
  }

  function publish(change: WorkoutChange) {
    void invalidateWorkoutChange(cache, change).catch(onCacheError);
  }

  return {
    listPrograms: () => read(listProgramSummaries),
    sessionDetail: (programId: string, sessionId: string) =>
      read((transaction) =>
        getSessionDetail(transaction, programId, sessionId),
      ),
    createProgram: async (id: string, name: string) => {
      await write((transaction) => createProgram(transaction, id, name));
      publish({ type: "program-list", generation });
    },
    renameProgram: async (id: string, name: string) => {
      await write((transaction) => renameProgram(transaction, id, name));
      publish({ type: "program-name", generation, programId: id });
    },
    deleteProgram: async (id: string) => {
      await write((transaction) => deleteProgram(transaction, id));
      publish({ type: "program-list", generation });
      cache.removeQueries({ queryKey: workoutKeys.program(generation, id) });
    },
    saveSet: async (reference: SetReference, recording: SetRecording) => {
      const kind = await write(async (transaction) => {
        const current = await transaction.getFirstAsync<{
          kind: "Warmup" | "Main";
        }>(
          "SELECT kind FROM workout_sets WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?",
          reference.programId,
          reference.sessionId,
          reference.activityId,
          reference.setId,
        );
        if (!current) throw new Error("Workout set not found");
        await saveSetRecording(transaction, reference, recording, now());
        return current.kind;
      });
      publish({
        type: "set-recording",
        generation,
        programId: reference.programId,
        sessionId: reference.sessionId,
        kind,
      });
    },
    startSet: async (
      reference: SetReference,
      measurements: SetMeasurements,
    ) => {
      await write((transaction) =>
        startSet(transaction, reference, measurements, now()),
      );
      publish({
        type: "session-lifecycle",
        generation,
        programId: reference.programId,
        sessionId: reference.sessionId,
      });
    },
    completeSet: async (
      reference: SetReference,
      measurements: SetMeasurements,
    ) => {
      const next = await write((transaction) =>
        completeSetAndAdvance(transaction, reference, measurements, now()),
      );
      publish({
        type: "session-lifecycle",
        generation,
        programId: reference.programId,
        sessionId: reference.sessionId,
      });
      return next;
    },
  };
}
