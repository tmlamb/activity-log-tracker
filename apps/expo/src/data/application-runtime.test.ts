import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

import type { openApplicationDatabase } from "./database/connections";
import type { SessionEditorSeed } from "./repositories/session-editor";
import {
  getMemoryExercise,
  getMemorySessionEditorSeed,
} from "./application-memory";
import { createApplicationDataRuntime } from "./application-runtime";
import { prepareApplicationRestore } from "./backup/prepare-restore";
import { workoutKeys } from "./cache/keys";
import { SCHEMA_V1, SCHEMA_V2 } from "./database/schema";
import { createTransactionQueue } from "./database/transactions";
import { draftFromSession } from "./domain/session-editor-draft";
import { bootstrapLegacyConversion } from "./legacy/bootstrap";

function setup(state = "ready") {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} ${SCHEMA_V2}
    INSERT INTO bootstrap_state VALUES (1, 'db', '${state}', 1);
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id,id,name,position,status,deload,start_ms,last_activity_at_ms)
      VALUES ('p','s','Session',0,'Ready',0,100,200);
    INSERT INTO activities(program_id,session_id,id,position) VALUES ('p','s','a',0);
    INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps)
      VALUES ('p','s','a','set','Main',0,'Ready','Neutral',4);`);
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
  let closed = 0;
  const database = {
    read: queue,
    write: queue,
    close: async () => {
      await queue.close();
      db.close();
      closed++;
    },
  } as unknown as Awaited<ReturnType<typeof openApplicationDatabase>>;
  const onCacheError = vi.fn();
  let clock = 7_200_000;
  return {
    db,
    queue,
    database,
    onCacheError,
    setClock: (value: number) => {
      clock = value;
    },
    now: () => clock,
    closed: () => closed,
  };
}

describe("application data runtime", () => {
  it("verifies conversion on a fresh connection before running inactivity cleanup", async () => {
    const directory = mkdtempSync(join(process.cwd(), ".sqlite-runtime-test-"));
    const path = join(directory, "app.sqlite");
    const start = Date.UTC(2026, 0, 1);
    const now = start + 7_200_000;
    const legacy = JSON.stringify({
      version: 2,
      state: {
        programs: [
          {
            programId: "p",
            name: "Program",
            sessions: [
              {
                sessionId: "s",
                name: "Session",
                status: "Ready",
                deload: false,
                start: new Date(start).toISOString(),
                lastActivityAt: new Date(start).toISOString(),
                activities: [],
              },
            ],
          },
        ],
      },
    });
    const keys = new Map([["workout-storage", legacy]]);
    let opens = 0;
    const open = () => {
      opens++;
      const db = new DatabaseSync(path);
      db.exec("PRAGMA foreign_keys = ON");
      const transaction = {
        execAsync: (sql: string) => {
          db.exec(sql);
          return Promise.resolve();
        },
        getFirstAsync: <T>(
          sql: string,
          ...params: (string | number | null)[]
        ) =>
          Promise.resolve(
            (db.prepare(sql).get(...params) as T | undefined) ?? null,
          ),
        getAllAsync: <T>(sql: string, ...params: (string | number | null)[]) =>
          Promise.resolve(db.prepare(sql).all(...params) as T[]),
        runAsync: (sql: string, ...params: (string | number | null)[]) =>
          Promise.resolve({
            changes: Number(db.prepare(sql).run(...params).changes),
          }),
        prepareAsync: (sql: string) => {
          const statement = db.prepare(sql);
          return Promise.resolve({
            executeAsync: (...params: (string | number | null)[]) =>
              Promise.resolve(statement.run(...params)),
            finalizeAsync: () => Promise.resolve(),
          });
        },
      };
      const queue = createTransactionQueue(transaction, "BEGIN IMMEDIATE");
      const database = {
        read: queue,
        write: queue,
        close: async () => {
          await queue.close();
          db.close();
        },
      } as unknown as Awaited<ReturnType<typeof openApplicationDatabase>>;
      return Promise.resolve(database);
    };
    const storage = {
      getItemAsync: (key: string) => Promise.resolve(keys.get(key) ?? null),
      setItemAsync: (key: string, value: string) => {
        keys.set(key, value);
        return Promise.resolve();
      },
      removeItemAsync: (key: string) => {
        keys.delete(key);
        return Promise.resolve();
      },
    };
    let runtime:
      | Awaited<ReturnType<typeof createApplicationDataRuntime>>
      | undefined;
    try {
      runtime = await createApplicationDataRuntime({
        open: () =>
          bootstrapLegacyConversion({
            open,
            storage,
            createDatabaseId: () => "db",
            now: () => now,
          }),
        now: () => now,
        onCacheError: vi.fn(),
      });
      expect(opens).toBe(2);
      expect(keys.has("workout-storage")).toBe(false);
      expect(keys.has("activity-log-sqlite-cutover")).toBe(true);
      expect(
        await runtime.getSnapshot().service.sessionDetail("p", "s"),
      ).toMatchObject({ status: "Incomplete", endMs: start });
      const report = await runtime.getSnapshot().service.listPrograms();
      expect(report).toMatchObject([{ id: "p", sessionCount: 1 }]);
    } finally {
      await runtime?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("runs inactivity cleanup before readiness and on resume", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      expect(runtime.getSnapshot().generation).toBe(1);
      expect(
        runtime.getSnapshot().memory?.sessions.get('["p","s"]')?.status,
      ).toBe("Incomplete");
      expect(
        await runtime.getSnapshot().service.sessionDetail("p", "s"),
      ).toMatchObject({ status: "Incomplete", endMs: 200 });
      test.db.exec(
        "UPDATE sessions SET status = 'Ready', last_activity_at_ms = 7200000 WHERE id = 's'",
      );
      test.setClock(10_800_000);
      await runtime.resume();
      expect(
        await runtime.getSnapshot().service.sessionDetail("p", "s"),
      ).toMatchObject({ status: "Incomplete", endMs: 7_200_000 });
      expect(test.onCacheError).not.toHaveBeenCalled();
    } finally {
      await runtime.close();
    }
    expect(test.closed()).toBe(1);
  });

  it("publishes program and equipment changes into the hydrated view", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      expect(runtime.getSnapshot().memory?.programs.get("p")?.name).toBe(
        "Program",
      );
      await runtime.getSnapshot().service.renameProgram("p", "New name");
      expect(runtime.getSnapshot().memory?.programs.get("p")?.name).toBe(
        "New name",
      );
      expect(await runtime.getSnapshot().service.programHeader("p")).toEqual({
        id: "p",
        name: "New name",
      });
      await runtime.getSnapshot().service.createProgram("new", "New program");
      expect(runtime.getSnapshot().memory?.programs.get("new")?.name).toBe(
        "New program",
      );
      await runtime
        .getSnapshot()
        .service.replaceEquipment({ barbells: [], plates: [] });
      expect(runtime.getSnapshot().memory?.data.equipment).toEqual({
        barbells: [],
        plates: [],
      });
    } finally {
      await runtime.close();
    }
  });

  it("rebuilds memory after a cache-publication failure without losing the committed write", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      const key = workoutKeys.sessionEditorSeed(1, "p", "s");
      runtime.cache.setQueryData(
        key,
        await runtime.getSnapshot().service.sessionEditorSeed("p", "s"),
      );
      vi.spyOn(runtime.cache, "setQueryData").mockImplementationOnce(() => {
        throw new Error("cache failure");
      });
      await runtime
        .getSnapshot()
        .service.patchSet(
          { programId: "p", sessionId: "s", activityId: "a", setId: "set" },
          { actualReps: 9 },
        );
      await vi.waitFor(() =>
        expect(runtime.getSnapshot().memory).not.toBeNull(),
      );
      const memory = runtime.getSnapshot().memory;
      if (!memory) throw new Error("Memory was not recovered");
      expect(getMemorySessionEditorSeed(memory, "p", "s")).toEqual(
        await runtime.getSnapshot().service.sessionEditorSeed("p", "s"),
      );
      expect(test.onCacheError).toHaveBeenCalled();
    } finally {
      await runtime.close();
    }
  });

  it("publishes committed set edits and progression into the hydrated view", async () => {
    const test = setup();
    test.db
      .exec(`UPDATE sessions SET status = 'Planned', start_ms = NULL, last_activity_at_ms = NULL WHERE id = 's';
      UPDATE workout_sets SET status = 'Planned', actual_reps = 0 WHERE id = 'set';
      INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback)
        VALUES ('p','s','a','next','Main',1,'Planned','Neutral');`);
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    const reference = {
      programId: "p",
      sessionId: "s",
      activityId: "a",
      setId: "set",
    };
    const measurements = {
      actualReps: 4,
      weight: { value: 80, unit: "lbs" as const },
      feedback: "Neutral" as const,
    };
    try {
      runtime.cache.setQueryData(
        workoutKeys.sessionEditorSeed(1, "p", "s"),
        await runtime.getSnapshot().service.sessionEditorSeed("p", "s"),
      );
      await runtime.getSnapshot().service.startSet(reference, measurements);
      let memory = runtime.getSnapshot().memory;
      expect(memory).not.toBeNull();
      if (!memory) throw new Error("Missing memory");
      const cached = runtime.cache.getQueryData<SessionEditorSeed | null>(
        workoutKeys.sessionEditorSeed(1, "p", "s"),
      );
      expect(cached?.session?.status).toBe("Ready");
      expect(cached?.session?.activities[0]?.mainSets[0]?.status).toBe("Ready");
      expect(getMemorySessionEditorSeed(memory, "p", "s")).toEqual(
        await runtime.getSnapshot().service.sessionEditorSeed("p", "s"),
      );
      await runtime
        .getSnapshot()
        .service.patchSet(reference, { actualReps: 8 });
      await Promise.all([
        runtime.getSnapshot().service.patchSet(reference, { actualReps: 9 }),
        runtime.getSnapshot().service.patchSet(reference, { feedback: "Hard" }),
      ]);
      memory = runtime.getSnapshot().memory;
      if (!memory) throw new Error("Missing memory after patch");
      expect(getMemorySessionEditorSeed(memory, "p", "s")).toEqual(
        await runtime.getSnapshot().service.sessionEditorSeed("p", "s"),
      );
      await runtime
        .getSnapshot()
        .service.completeSet(reference, { ...measurements, actualReps: 8 });
      memory = runtime.getSnapshot().memory;
      if (!memory) throw new Error("Missing memory after completion");
      expect(getMemorySessionEditorSeed(memory, "p", "s")).toEqual(
        await runtime.getSnapshot().service.sessionEditorSeed("p", "s"),
      );
    } finally {
      await runtime.close();
    }
  });

  it("keeps the hydrated view in sync through template creation, lineage rename and deletion", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      const service = runtime.getSnapshot().service;
      const original = await service.sessionEditorSeed("p", "s");
      if (!original?.session) throw new Error("Missing original session");
      await service.createSession(
        "p",
        "new",
        {
          name: "New",
          deload: false,
          startMs: null,
          endMs: null,
          activities: [],
        },
        {
          sessionId: "s",
          baseRevision: original.session.revision,
          newLineageId: "lineage",
        },
      );
      let memory = runtime.getSnapshot().memory;
      if (!memory) throw new Error("Memory discarded after creation");
      for (const id of ["s", "new"])
        expect(getMemorySessionEditorSeed(memory, "p", id)).toEqual(
          await service.sessionEditorSeed("p", id),
        );
      const next = getMemorySessionEditorSeed(memory, "p", "new")?.session;
      if (!next) throw new Error("Missing new session");
      await service.saveSession(
        "p",
        "new",
        next.revision,
        { ...draftFromSession(next), name: "Renamed" },
        true,
      );
      memory = runtime.getSnapshot().memory;
      if (!memory) throw new Error("Memory discarded after rename");
      for (const id of ["s", "new"])
        expect(getMemorySessionEditorSeed(memory, "p", id)).toEqual(
          await service.sessionEditorSeed("p", id),
        );
      const renamed = getMemorySessionEditorSeed(memory, "p", "new")?.session;
      if (!renamed) throw new Error("Missing renamed session");
      await service.deleteSession("p", "new", renamed.revision);
      memory = runtime.getSnapshot().memory;
      if (!memory) throw new Error("Memory discarded after delete");
      expect(getMemorySessionEditorSeed(memory, "p", "new")).toBeNull();
      expect(getMemorySessionEditorSeed(memory, "p", "s")).toEqual(
        await service.sessionEditorSeed("p", "s"),
      );
    } finally {
      await runtime.close();
    }
  });

  it("keeps exercise, equipment and muscle changes consistent with SQLite", async () => {
    const test = setup();
    test.db.exec(`INSERT INTO barbells VALUES ('bar',0,45,'lbs');
      INSERT INTO exercises(id,name,normalized_name,position,load_kind,barbell_id,deleted,revision)
        VALUES ('e','Exercise','exercise',0,'BARBELL','bar',0,0);
      INSERT INTO muscle_labels VALUES (1,'Chest','chest'),(2,'Back','back');
      INSERT INTO muscle_catalog VALUES (0,1),(1,2);
      INSERT INTO exercise_muscles VALUES ('e',0,1),('e',1,2);`);
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      const service = runtime.getSnapshot().service;
      const check = async () => {
        const memory = runtime.getSnapshot().memory;
        if (!memory) throw new Error("Memory discarded");
        expect(getMemoryExercise(memory, "e")).toEqual(
          await service.exercise("e"),
        );
      };
      await service.setExerciseNotes("e", "notes");
      await check();
      await service.replaceMuscles(["Chest"]);
      await check();
      await service.replaceEquipment({ barbells: [], plates: [] });
      await check();
      const current = await service.exercise("e");
      if (!current) throw new Error("Missing exercise");
      await service.editExercise("e", current.revision, {
        name: "Renamed",
        loadKind: current.loadKind,
        barbellId: null,
        oneRepMax: current.oneRepMax,
        notes: current.notes,
        primaryMuscles: current.primaryMuscles,
      });
      await check();
      await service.setExerciseDeleted("e", true);
      await check();
    } finally {
      await runtime.close();
    }
  });

  it("publishes a new generation after reset and rejects old services", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      const previous = runtime.getSnapshot();
      const listener = vi.fn();
      const listenerError = new Error("listener failed");
      runtime.subscribe(() => {
        throw listenerError;
      });
      const unsubscribe = runtime.subscribe(listener);
      expect(await runtime.reset()).toBe(2);
      expect(runtime.getSnapshot().generation).toBe(2);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(test.onCacheError).toHaveBeenCalledWith(listenerError);
      expect(await runtime.getSnapshot().service.listPrograms()).toEqual([]);
      await expect(previous.service.listPrograms()).rejects.toThrow(
        "dataset has changed",
      );
      unsubscribe();
    } finally {
      await runtime.close();
    }
  });

  it("does not expose an unready target and closes it on startup failure", async () => {
    const test = setup("awaiting-verification");
    await expect(
      createApplicationDataRuntime({
        open: () => Promise.resolve(test.database),
        now: test.now,
        onCacheError: test.onCacheError,
      }),
    ).rejects.toThrow("not ready");
    expect(test.closed()).toBe(1);
  });

  it("publishes a fresh service after restoring a prepared backup", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    try {
      const backup = await runtime.getSnapshot().service.exportBackupV2();
      const listener = vi.fn();
      runtime.subscribe(listener);
      expect(await runtime.reset()).toBe(2);
      const stale = runtime.getSnapshot().service;
      expect(await runtime.restore(prepareApplicationRestore(backup))).toBe(3);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(await runtime.getSnapshot().service.listPrograms()).toMatchObject([
        { id: "p", name: "Program" },
      ]);
      await expect(stale.listPrograms()).rejects.toThrow("dataset has changed");
    } finally {
      await runtime.close();
    }
  });

  it("closes after accepted writes settle, and refuses later jobs", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    let release: (() => void) | undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const accepted = test.queue(async (transaction) => {
      await wait;
      await transaction.runAsync(
        "INSERT INTO programs(id,name,position) VALUES ('new','New',1)",
      );
    });
    const closing = runtime.close();
    await expect(test.queue(() => Promise.resolve())).rejects.toThrow(
      "closing",
    );
    expect(test.closed()).toBe(0);
    release?.();
    await accepted;
    await Promise.all([closing, runtime.close()]);
    expect(test.closed()).toBe(1);
    await expect(runtime.resume()).rejects.toThrow("closing");
  });

  it("serializes dataset replacement and waits for it during shutdown", async () => {
    const test = setup();
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(test.database),
      now: test.now,
      onCacheError: test.onCacheError,
    });
    let release: (() => void) | undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const accepted = test.queue(async () => {
      await wait;
    });
    const reset = runtime.reset();
    await expect(runtime.reset()).rejects.toThrow(
      "replacement is already in progress",
    );
    const closing = runtime.close();
    expect(test.closed()).toBe(0);
    release?.();
    await accepted;
    expect(await reset).toBe(2);
    await closing;
    expect(test.closed()).toBe(1);
  });
});
