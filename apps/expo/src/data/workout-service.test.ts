import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

import { workoutKeys } from "./cache/keys";
import { createWorkoutQueryClient } from "./cache/query-client";
import { SCHEMA_V1 } from "./database/schema";
import { createTransactionQueue } from "./database/transactions";
import { createWorkoutService } from "./workout-service";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO bootstrap_state(singleton, database_id, state, generation) VALUES (1, 'db', 'ready', 1);`);
  const transaction = {
    execAsync: (sql: string) => {
      db.exec(sql);
      return Promise.resolve();
    },
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve(db.prepare(sql).all(...parameters) as T[]),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
  const queue = createTransactionQueue(transaction, "BEGIN IMMEDIATE");
  const database = {
    read: queue,
    write: queue,
    close: () => Promise.resolve(),
  } as unknown as Parameters<typeof createWorkoutService>[0];
  const cache = createWorkoutQueryClient();
  const onCacheError = vi.fn();
  return {
    db,
    cache,
    onCacheError,
    service: createWorkoutService(database, cache, 1, onCacheError, () => 1000),
  };
}

describe("workout data service", () => {
  it("commits before invalidating program summaries and keeps failures out of the cache", async () => {
    const { db, cache, service, onCacheError } = setup();
    try {
      const key = workoutKeys.programs(1);
      cache.setQueryData(key, []);
      await service.createProgram("p", " Program ");
      await vi.waitFor(() =>
        expect(cache.getQueryState(key)?.isInvalidated).toBe(true),
      );
      expect(await service.listPrograms()).toEqual([
        { id: "p", name: "Program", sessionCount: 0 },
      ]);
      cache.setQueryData(key, "fresh");
      await expect(service.createProgram("p", "Duplicate")).rejects.toThrow();
      expect(cache.getQueryState(key)?.isInvalidated).toBe(false);
      expect(onCacheError).not.toHaveBeenCalled();
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("rejects reads and writes from a replaced dataset generation", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec("UPDATE bootstrap_state SET generation = 2");
      await expect(service.createProgram("p", "Stale")).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.listPrograms()).rejects.toThrow(
        "dataset has changed",
      );
      expect(
        db.prepare("SELECT count(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
    } finally {
      cache.clear();
      db.close();
    }
  });
});
