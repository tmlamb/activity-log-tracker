import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { buildProgramInsights } from "@activity-log/ui/utils";

import type { openApplicationDatabase } from "../database/connections";
import { parseActivityLogBackup } from "../../utils/app-data-backup";
import {
  applyMemoryChange,
  buildApplicationMemory,
  getMemorySessionEditorSeed,
  readApplicationMemoryFacts,
} from "../application-memory";
import { createWorkoutQueryClient } from "../cache/query-client";
import { SCHEMA_V1 } from "../database/schema";
import { createTransactionQueue } from "../database/transactions";
import { buildProgramInsightProjection } from "../domain/program-insights";
import { restoreVersion1Data } from "../lifecycle/restore-v1";
import { presentProgramInsights } from "../react/insight-presenters";
import { readProgramInsightFacts } from "../repositories/program-insights";
import { getSessionEditorSeed } from "../repositories/session-editor";
import { createWorkoutService } from "../workout-service";
import { buildPortableDataV2, readPortableFactsV2 } from "./export-v2";
import { serializePortableBackupV2 } from "./portable-v2";
import { prepareApplicationRestore } from "./prepare-restore";
import { restoreVersion2Data } from "./restore-v2";

describe("portable backup historical round trip", () => {
  it("retains every exported domain record through v1 import and v2 restore", async () => {
    const contents = readFileSync(
      new URL("../legacy/fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );
    const source = prepareApplicationRestore(contents);
    const original = parseActivityLogBackup(contents)["workout-storage"];
    if (source.version !== 1)
      throw new Error("An official v1 backup is required.");
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
        INSERT INTO bootstrap_state VALUES (1, 'test-db', 'ready', 1);`);
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
      const write = createTransactionQueue(transaction, "BEGIN IMMEDIATE");
      expect(await write((tx) => restoreVersion1Data(tx, 1, source.data))).toBe(
        2,
      );
      const now = new Date(2026, 10, 13, 12);
      for (const program of original.programs) {
        const facts = await write((tx) =>
          readProgramInsightFacts(tx, program.programId),
        );
        if (!facts) throw new Error("A program is missing after import.");
        const actual = presentProgramInsights(
          buildProgramInsightProjection(facts, now.getTime()),
        );
        expect(actual).toEqual(
          buildProgramInsights(program, original.exercises, now),
        );
      }
      const before = buildPortableDataV2(await write(readPortableFactsV2));
      const memory = buildApplicationMemory(
        await write(readApplicationMemoryFacts),
        2,
      );
      expect(memory.data).toEqual(before);
      for (const program of before.programs) {
        const indexes = new Set([
          0,
          Math.floor(program.sessions.length / 2),
          program.sessions.length - 1,
        ]);
        for (const index of indexes) {
          const session = program.sessions[index];
          if (session)
            expect(
              getMemorySessionEditorSeed(memory, program.id, session.id),
            ).toEqual(
              await write((tx) =>
                getSessionEditorSeed(tx, 2, program.id, session.id),
              ),
            );
        }
      }
      const backupV2 = serializePortableBackupV2(before, Date.now());
      const prepared = prepareApplicationRestore(backupV2);
      if (prepared.version !== 2) throw new Error("Expected a v2 backup.");
      expect(
        await write((tx) => restoreVersion2Data(tx, 2, prepared.data)),
      ).toBe(3);
      expect(buildPortableDataV2(await write(readPortableFactsV2))).toEqual(
        before,
      );
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      const restored = buildApplicationMemory(
        await write(readApplicationMemoryFacts),
        3,
      );
      const program = restored.data.programs.find((item) =>
        item.sessions.some((session) =>
          session.activities.some(
            (activity) =>
              activity.mainSets.length || activity.warmupSets.length,
          ),
        ),
      );
      const session = program?.sessions.find((item) =>
        item.activities.some(
          (activity) => activity.mainSets.length || activity.warmupSets.length,
        ),
      );
      const activity = session?.activities.find(
        (item) => item.mainSets.length || item.warmupSets.length,
      );
      const set = activity?.mainSets[0] ?? activity?.warmupSets[0];
      if (!program || !session || !activity || !set)
        throw new Error("Backup has no workout set to test.");
      const cache = createWorkoutQueryClient();
      const errors: unknown[] = [];
      const database = {
        read: write,
        write,
        close: () => Promise.resolve(),
      } as unknown as Awaited<ReturnType<typeof openApplicationDatabase>>;
      const service = createWorkoutService(
        database,
        cache,
        3,
        (error) => errors.push(error),
        () => now.getTime(),
        (_change, mutation) => {
          if (!mutation || !applyMemoryChange(restored, mutation))
            throw new Error("Memory publication failed.");
        },
      );
      const reference = {
        programId: program.id,
        sessionId: session.id,
        activityId: activity.id,
        setId: set.id,
      };
      await service.patchSet(reference, {
        actualReps: (set.actualReps ?? 0) + 1,
      });
      expect(
        getMemorySessionEditorSeed(restored, program.id, session.id),
      ).toEqual(await service.sessionEditorSeed(program.id, session.id));
      expect(errors).toEqual([]);
      cache.clear();
    } finally {
      db.close();
    }
  }, 120_000);
});
