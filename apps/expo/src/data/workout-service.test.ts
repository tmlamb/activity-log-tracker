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
      await expect(service.programHeader("p")).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.programOverview("p")).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.programWeek("p", { week: 1 })).rejects.toThrow(
        "dataset has changed",
      );
      await expect(
        service.setContext({
          programId: "p",
          sessionId: "s",
          activityId: "a",
          setId: "set",
        }),
      ).rejects.toThrow("dataset has changed");
      expect(
        db.prepare("SELECT count(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("exposes header, overview, paginated weeks, and selected-set reads through the generation boundary", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec(`INSERT INTO programs VALUES ('p', 'Program', 0);
        INSERT INTO sessions(program_id, id, name, position, status, deload)
          VALUES ('p', 's', 'Selected', 0, 'Planned', 0);
        INSERT INTO activities(program_id, session_id, id, position)
          VALUES ('p', 's', 'a', 0);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
          VALUES ('p', 's', 'a', 'set', 'Main', 0, 'Planned', 'Neutral');`);
      expect(await service.programHeader("p")).toEqual({
        id: "p",
        name: "Program",
      });
      expect(await service.programOverview("p")).toMatchObject({
        programId: "p",
        sessionCount: 1,
        currentWeek: 1,
        weeks: [{ week: 1, sessionCount: 1 }],
      });
      expect(
        (await service.programWeek("p", { week: 1 }))?.items.map(
          ({ id }) => id,
        ),
      ).toEqual(["s"]);
      expect(
        await service.setContext({
          programId: "p",
          sessionId: "s",
          activityId: "a",
          setId: "set",
        }),
      ).toMatchObject({ exercise: null, isStartable: true });
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("invalidates surviving lineage contexts when a preceding session is deleted", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec(`INSERT INTO programs VALUES ('p', 'Program', 0);
        INSERT INTO session_lineages VALUES ('p', 'lineage');
        INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload)
          VALUES ('p', 'previous', 'lineage', 'Previous', 0, 'Done', 0),
                 ('p', 's', 'lineage', 'Selected', 1, 'Planned', 0);
        INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
          VALUES ('p', 's', 'a', 'set', 'Main', 0, 'Planned', 'Neutral');`);
      const reference = {
        programId: "p",
        sessionId: "s",
        activityId: "a",
        setId: "set",
      };
      const key = [...workoutKeys.setContexts(1, "p", "s"), "a", "set"];
      const before = await service.setContext(reference);
      expect(before?.hasTemplateHistory).toBe(true);
      cache.setQueryData(key, before);
      await service.deleteSession("p", "previous", 0);
      await vi.waitFor(() =>
        expect(cache.getQueryState(key)?.isInvalidated).toBe(true),
      );
      expect((await service.setContext(reference))?.hasTemplateHistory).toBe(
        false,
      );
    } finally {
      cache.clear();
      db.close();
    }
  });
});
