import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { URL } from "node:url";
import { describe, expect, it, vi } from "vitest";

import type { openApplicationDatabase } from "./database/connections";
import { parseActivityLogBackup } from "../utils/app-data-backup";
import { createApplicationDataRuntime } from "./application-runtime";
import { parsePortableBackupV2 } from "./backup/portable-v2";
import { prepareApplicationRestore } from "./backup/prepare-restore";
import { createTransactionQueue } from "./database/transactions";
import { newDraftActivity } from "./domain/session-editor-draft";
import { bootstrapLegacyConversion } from "./legacy/bootstrap";
import { createTemplateDraft } from "./repositories/template-draft";

describe("SQLite application flow", () => {
  it("converts, plans, records, completes, clones, exports, resets and restores on real SQLite", async () => {
    const directory = mkdtempSync(join(process.cwd(), ".sqlite-app-flow-"));
    const path = join(directory, "app.sqlite");
    const backup = readFileSync(
      new URL("./legacy/fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );
    const stores = parseActivityLogBackup(backup);
    const workout = JSON.stringify({
      version: 2,
      state: stores["workout-storage"],
    });
    const keys = new Map([
      ["workout-storage", workout],
      [
        "exercise-storage",
        JSON.stringify({ version: 2, state: stores["exercise-storage"] }),
      ],
    ]);
    let opens = 0;
    let now = Date.UTC(2026, 0, 1);
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
      let service = runtime.getSnapshot().service;
      expect(await service.listPrograms()).toMatchObject([
        { id: "program-1", sessionCount: 1 },
      ]);
      const preset = (await service.listExercisePresets()).find(
        (item) => item.name === "Custom exercise",
      );
      if (!preset) throw new Error("Missing custom preset");
      const exerciseId = await service.materializeExercisePreset(
        preset.id,
        "new-exercise",
      );
      expect(exerciseId).toBe("new-exercise");
      await service.createProgram("new-program", "New Program");
      let ids = 0;
      const activity = newDraftActivity(() => `id-${++ids}`, undefined);
      activity.exerciseId = exerciseId;
      activity.warmupSets = activity.warmupSets.slice(0, 1);
      activity.mainSets = activity.mainSets.slice(0, 1);
      const warmup = activity.warmupSets[0];
      const main = activity.mainSets[0];
      if (!warmup || !main) throw new Error("Missing test sets");
      await service.createSession(
        "new-program",
        "new-session",
        {
          name: "Training",
          deload: false,
          startMs: null,
          endMs: null,
          activities: [activity],
        },
        null,
      );
      const warmupRef = {
        programId: "new-program",
        sessionId: "new-session",
        activityId: activity.id,
        setId: warmup.id,
      };
      const mainRef = { ...warmupRef, setId: main.id };
      expect((await service.setContext(warmupRef))?.isStartable).toBe(true);
      await service.startSet(warmupRef, {
        actualReps: 5,
        weight: { value: 40, unit: "lbs" },
        feedback: "Neutral",
      });
      await service.patchSet(warmupRef, { actualReps: 6 });
      now += 60_000;
      expect(
        await service.completeSet(warmupRef, {
          actualReps: 6,
          weight: { value: 40, unit: "lbs" },
          feedback: "Easy",
        }),
      ).toBe(main.id);
      expect(await service.setContext(mainRef)).toMatchObject({
        session: { status: "Ready" },
        set: { status: "Ready" },
      });
      now += 60_000;
      await service.completeSet(mainRef, {
        actualReps: 8,
        weight: { value: 60, unit: "lbs" },
        feedback: "Hard",
      });
      expect(await service.completeSession("new-program", "new-session")).toBe(
        true,
      );
      const completed = await service.sessionDetail(
        "new-program",
        "new-session",
      );
      if (!completed) throw new Error("Missing completed session");
      expect(completed.status).toBe("Done");
      const draft = createTemplateDraft(completed, () => `clone-${++ids}`);
      await service.createSession("new-program", "planned", draft, {
        sessionId: completed.id,
        baseRevision: completed.revision,
        newLineageId: "lineage",
      });
      expect(
        await service.resolveTemplateChoice("new-program", "new-session"),
      ).toEqual({ kind: "planned", sessionId: "planned" });
      const exported = await service.exportBackupV2();
      const before = parsePortableBackupV2(exported).data;
      expect(await runtime.reset()).toBe(1);
      await expect(service.listPrograms()).rejects.toThrow(
        "dataset has changed",
      );
      expect(await runtime.getSnapshot().service.listPrograms()).toEqual([]);
      expect(await runtime.restore(prepareApplicationRestore(exported))).toBe(
        2,
      );
      service = runtime.getSnapshot().service;
      expect(
        parsePortableBackupV2(await service.exportBackupV2()).data,
      ).toEqual(before);
      expect(keys.get("workout-storage")).toBe(workout);
    } finally {
      await runtime?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
