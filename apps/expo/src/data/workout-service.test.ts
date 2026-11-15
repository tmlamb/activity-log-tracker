import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

import { parsePortableBackupV2 } from "./backup/portable-v2";
import { prepareVersion2Restore } from "./backup/restore-v2";
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
    prepareAsync: (sql: string) => {
      const statement = db.prepare(sql);
      return Promise.resolve({
        executeAsync: (...parameters: (string | number | null)[]) =>
          Promise.resolve(statement.run(...parameters)),
        finalizeAsync: () => Promise.resolve(),
      });
    },
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
  it("checks the current persisted session before accepting a completion", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec(`INSERT INTO programs VALUES ('p','P',0);
        INSERT INTO sessions(program_id,id,name,position,status,deload) VALUES ('p','s','S',0,'Ready',0);
        INSERT INTO activities(program_id,session_id,id,position) VALUES ('p','s','a',0);
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps)
          VALUES ('p','s','a','done','Main',0,'Done','Neutral',5), ('p','s','a','new','Main',1,'Planned','Neutral',0);`);
      expect(await service.completeSession("p", "s")).toBe(false);
      expect((await service.sessionDetail("p", "s"))?.status).toBe("Ready");
      db.exec(
        "UPDATE workout_sets SET status = 'Done', actual_reps = 5 WHERE id = 'new'",
      );
      expect(await service.completeSession("p", "s")).toBe(true);
      expect((await service.sessionDetail("p", "s"))?.status).toBe("Done");
    } finally {
      cache.clear();
      db.close();
    }
  });
  it("restores an edited soft-deleted exercise atomically and checks its revision", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec(
        `INSERT INTO exercises(id,name,normalized_name,position,deleted) VALUES ('old','Old','old',0,1), ('active','Taken','taken',1,0)`,
      );
      const input = {
        name: "Taken",
        loadKind: "SINGLE_WEIGHT" as const,
        barbellId: null,
        oneRepMax: null,
        primaryMuscles: [],
        notes: "new",
      };
      await expect(service.restoreExercise("old", 0, input)).rejects.toThrow(
        "name already exists",
      );
      expect(await service.exercise("old")).toMatchObject({
        name: "Old",
        notes: null,
        deleted: true,
        revision: 0,
      });
      await service.restoreExercise("old", 0, { ...input, name: "Recovered" });
      expect(await service.exercise("old")).toMatchObject({
        name: "Recovered",
        notes: "new",
        deleted: false,
        revision: 2,
      });
      await expect(service.setExerciseDeleted("old", true, 0)).rejects.toThrow(
        "exercise changed",
      );
      expect((await service.exercise("old"))?.deleted).toBe(false);
    } finally {
      cache.clear();
      db.close();
    }
  });
  it("rejects stale equipment and muscle drafts within the writer transaction", async () => {
    const { db, cache, service } = setup();
    try {
      const initialEquipment = await service.equipment();
      const initialMuscles = await service.listMuscles();
      const updatedEquipment = {
        barbells: [{ barbellId: "1", value: 45, unit: "lbs" as const }],
        plates: [],
      };
      await service.replaceEquipment(updatedEquipment, initialEquipment);
      await service.replaceMuscles(["Chest"], initialMuscles);
      await expect(
        service.replaceEquipment(
          { barbells: [], plates: [] },
          initialEquipment,
        ),
      ).rejects.toThrow("Equipment changed");
      await expect(
        service.replaceMuscles(["Back"], initialMuscles),
      ).rejects.toThrow("Muscle groups changed");
      expect(await service.equipment()).toEqual(updatedEquipment);
      expect(await service.listMuscles()).toEqual(["Chest"]);
    } finally {
      cache.clear();
      db.close();
    }
  });

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
      await expect(service.programInsights("p")).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.exportBackupV2()).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.programWeek("p", { week: 1 })).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.sessionPolicy("p", "s")).rejects.toThrow(
        "dataset has changed",
      );
      await expect(service.sessionEditorSeed("p", "s")).rejects.toThrow(
        "dataset has changed",
      );
      await expect(
        service.planningWeightHints(
          "p",
          null,
          [{ exerciseId: "e", loadType: "RPE" }],
          "Main",
        ),
      ).rejects.toThrow("dataset has changed");
      await expect(
        service.setContext({
          programId: "p",
          sessionId: "s",
          activityId: "a",
          setId: "set",
        }),
      ).rejects.toThrow("dataset has changed");
      await expect(
        service.exerciseSeries({
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
      expect(await service.programInsights("p")).toMatchObject({
        programName: "Program",
        partial: true,
        weeks: [{ week: 1 }],
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
      expect(
        await service.exerciseSeries({
          programId: "p",
          sessionId: "s",
          activityId: "a",
          setId: "set",
        }),
      ).toBeNull();
      expect(await service.sessionPolicy("p", "s")).toEqual({
        canSetDeload: false,
        isLatestCompletedInLineage: false,
      });
      expect(await service.sessionEditorSeed("p", "s")).toMatchObject({
        generation: 1,
        session: { id: "s", revision: 0 },
        exercises: [],
      });
      expect(
        await service.planningWeightHints(
          "p",
          null,
          [{ exerciseId: "e", loadType: "RPE" }],
          "Main",
        ),
      ).toEqual([{ activityIndex: 0, weight: null }]);
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

  it("discards old-generation caches after a committed reset and rejects stale service writes", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec("INSERT INTO programs VALUES ('p', 'Program', 0)");
      cache.setQueryData(workoutKeys.programs(1), [{ id: "p" }]);
      cache.setQueryData(workoutKeys.programs(2), "new generation");
      expect(await service.resetApplicationData()).toBe(2);
      expect(cache.getQueryData(workoutKeys.programs(1))).toBeUndefined();
      expect(cache.getQueryData(workoutKeys.programs(2))).toBe(
        "new generation",
      );
      await expect(service.createProgram("stale", "Stale")).rejects.toThrow(
        "dataset has changed",
      );
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("returns the committed reset generation even if cache error reporting fails", async () => {
    const { db, cache, service, onCacheError } = setup();
    try {
      const cacheError = new Error("cache cancellation failed");
      vi.spyOn(cache, "cancelQueries").mockRejectedValueOnce(cacheError);
      onCacheError.mockImplementationOnce(() => {
        throw new Error("reporter failed");
      });
      cache.setQueryData(workoutKeys.programs(1), "cached");
      expect(await service.resetApplicationData()).toBe(2);
      expect(onCacheError).toHaveBeenCalledWith(cacheError);
      expect(cache.getQueryData(workoutKeys.programs(1))).toBeUndefined();
      expect(
        db.prepare("SELECT generation FROM bootstrap_state").get(),
      ).toEqual({ generation: 2 });
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("publishes session reset only after a successful commit", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec(`INSERT INTO programs VALUES ('p', 'Program', 0);
        INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
          VALUES ('p', 's', 'Session', 0, 'Done', 0, 100);
        INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps)
          VALUES ('p', 's', 'a', 'set', 'Main', 0, 'Done', 'Neutral', 5);`);
      const detail = workoutKeys.sessionDetail(1, "p", "s");
      const timeline = workoutKeys.timeline(1, "p");
      cache.setQueryData(detail, "old");
      cache.setQueryData(timeline, "old");
      await expect(service.resetSession("p", "s", 1)).rejects.toThrow(
        "session changed",
      );
      expect(cache.getQueryState(detail)?.isInvalidated).toBe(false);
      await service.resetSession("p", "s", 0);
      await vi.waitFor(() =>
        expect(cache.getQueryState(detail)?.isInvalidated).toBe(true),
      );
      expect(cache.getQueryState(timeline)?.isInvalidated).toBe(true);
      expect((await service.sessionDetail("p", "s"))?.status).toBe("Planned");
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("invalidates affected workout targets after a 1RM change but not for a no-op", async () => {
    const { db, cache, service } = setup();
    try {
      db.exec(`INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);
        INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('p', 's', 'Session', 0, 'Planned', 0);
        INSERT INTO exercises(id, name, normalized_name, position, one_rep_max_value, one_rep_max_unit) VALUES ('e', 'Exercise', 'exercise', 0, 100, 'lbs');
        INSERT INTO activities(program_id, session_id, id, exercise_id, position) VALUES ('p', 's', 'a', 'e', 0);`);
      const detail = workoutKeys.sessionDetail(1, "p", "s");
      const insights = workoutKeys.programInsights(1, "p");
      const unrelated = workoutKeys.programInsights(1, "other");
      for (const key of [detail, insights, unrelated])
        cache.setQueryData(key, "cached");
      await service.setExerciseOneRepMax("e", { value: 100, unit: "lbs" });
      expect(cache.getQueryState(detail)?.isInvalidated).toBe(false);
      await service.setExerciseOneRepMax("e", { value: 120, unit: "kg" });
      await vi.waitFor(() =>
        expect(cache.getQueryState(detail)?.isInvalidated).toBe(true),
      );
      expect(cache.getQueryState(insights)?.isInvalidated).toBe(true);
      expect(cache.getQueryState(unrelated)?.isInvalidated).toBe(false);
      expect(await service.exercise("e")).toMatchObject({
        oneRepMax: { value: 120, unit: "kg" },
        revision: 1,
      });
    } finally {
      cache.clear();
      db.close();
    }
  });

  it("exports and atomically restores v2 backups while retiring the old cache generation", async () => {
    const { db, cache, service } = setup();
    try {
      await service.createProgram("original", "Original");
      const contents = await service.exportBackupV2();
      expect(parsePortableBackupV2(contents).data.programs).toMatchObject([
        { id: "original", name: "Original" },
      ]);
      await service.createProgram("later", "Later");
      const oldKey = workoutKeys.programs(1);
      cache.setQueryData(oldKey, "cached");
      expect(
        await service.restoreVersion2(prepareVersion2Restore(contents)),
      ).toBe(2);
      expect(cache.getQueryData(oldKey)).toBeUndefined();
      expect(
        db.prepare("SELECT id FROM programs ORDER BY position").all(),
      ).toEqual([{ id: "original" }]);
      await expect(service.listPrograms()).rejects.toThrow(
        "dataset has changed",
      );
    } finally {
      cache.clear();
      db.close();
    }
  });
});
