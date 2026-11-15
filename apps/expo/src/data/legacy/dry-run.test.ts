import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { createTransactionQueue } from "../database/transactions";
import { runConversionDryRun } from "./dry-run";

function harness(workout: string, corruptOnReopen = false) {
  const directory = mkdtempSync(join(process.cwd(), ".sqlite-dry-run-"));
  const path = join(directory, "scratch.sqlite");
  const keys = new Map<string, string>([["workout-storage", workout]]);
  let opens = 0;
  let removals = 0;
  let closed = 0;
  const options = {
    source: {
      getItemAsync: (key: string) => Promise.resolve(keys.get(key) ?? null),
    },
    open: () => {
      opens++;
      const db = new DatabaseSync(path);
      db.exec("PRAGMA foreign_keys = ON");
      if (corruptOnReopen && opens === 2)
        db.exec("UPDATE programs SET name = 'corrupted'");
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
        getAllAsync: <T>(sql: string) =>
          Promise.resolve(db.prepare(sql).all() as T[]),
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
      return Promise.resolve({
        read: queue,
        write: queue,
        close: () => {
          db.close();
          closed++;
          return Promise.resolve();
        },
      });
    },
    remove: () => {
      removals++;
      rmSync(path);
      return Promise.resolve();
    },
    now: () => 1000,
  };
  return {
    options,
    keys,
    path,
    opens: () => opens,
    removals: () => removals,
    closed: () => closed,
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

describe("native conversion dry run", () => {
  it("converts a copy, verifies after reopening, leaves source untouched and removes the scratch file", async () => {
    const source = JSON.stringify({
      version: 2,
      state: { programs: [{ programId: "p", name: "Program", sessions: [] }] },
    });
    const test = harness(source);
    try {
      const result = await runConversionDryRun(test.options);
      expect(result.counts.programs).toBe(1);
      expect(result.counts.sessions).toBe(0);
      expect(test.opens()).toBe(2);
      expect(test.closed()).toBe(2);
      expect(test.removals()).toBe(1);
      expect(existsSync(test.path)).toBe(false);
      expect([...test.keys]).toEqual([["workout-storage", source]]);
    } finally {
      test.cleanup();
    }
  });

  it("cleans up scratch data if source conversion fails", async () => {
    const test = harness("invalid-json");
    try {
      await expect(runConversionDryRun(test.options)).rejects.toThrow();
      expect(test.opens()).toBe(1);
      expect(test.closed()).toBe(1);
      expect(test.removals()).toBe(1);
      expect(existsSync(test.path)).toBe(false);
      expect(test.keys.get("workout-storage")).toBe("invalid-json");
    } finally {
      test.cleanup();
    }
  });

  it("distinguishes newly assigned legacy preset IDs from duplicate IDs that need repair", async () => {
    const test = harness(
      JSON.stringify({ version: 2, state: { programs: [] } }),
    );
    test.keys.set(
      "exercise-storage",
      JSON.stringify({
        version: 2,
        state: {
          exercises: [
            { name: "First", loadKind: "SINGLE_WEIGHT" },
            { id: "existing", name: "Second", loadKind: "SINGLE_WEIGHT" },
            { id: "existing", name: "Third", loadKind: "SINGLE_WEIGHT" },
          ],
        },
      }),
    );
    try {
      const result = await runConversionDryRun(test.options);
      expect(result.counts.exercise_presets).toBe(3);
      expect(result.presetIdsCreated).toBe(1);
      expect(result.remappedIds).toBe(1);
    } finally {
      test.cleanup();
    }
  });

  it("rejects a corrupted target during fresh-connection verification and removes it", async () => {
    const source = JSON.stringify({
      version: 2,
      state: { programs: [{ programId: "p", name: "Program", sessions: [] }] },
    });
    const test = harness(source, true);
    try {
      await expect(runConversionDryRun(test.options)).rejects.toThrow(
        "verification failed",
      );
      expect(test.opens()).toBe(2);
      expect(test.closed()).toBe(2);
      expect(test.removals()).toBe(1);
      expect(existsSync(test.path)).toBe(false);
      expect(test.keys.get("workout-storage")).toBe(source);
    } finally {
      test.cleanup();
    }
  });
});
