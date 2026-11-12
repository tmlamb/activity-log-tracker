import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { createTransactionQueue } from "../database/transactions";
import { bootstrapLegacyConversion } from "./bootstrap";

function harness() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
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
  };
  const queue = createTransactionQueue(transaction, "BEGIN IMMEDIATE");
  const keys = new Map<string, string>();
  let opens = 0;
  let failReceipt = false;
  const storage = {
    getItemAsync: (key: string) => Promise.resolve(keys.get(key) ?? null),
    setItemAsync: (key: string, value: string) => {
      if (failReceipt) return Promise.reject(new Error("receipt write failed"));
      keys.set(key, value);
      return Promise.resolve();
    },
  };
  const options = {
    open: () => {
      opens++;
      return Promise.resolve({
        read: queue,
        write: queue,
        close: () => Promise.resolve(),
      });
    },
    storage,
    createDatabaseId: () => "database-id",
    now: () => 123,
  };
  return {
    db,
    keys,
    options,
    opens: () => opens,
    failReceipt: (value: boolean) => {
      failReceipt = value;
    },
  };
}

describe("legacy conversion bootstrap", () => {
  it("converts once, reopens for verification, and ignores stale legacy data on restart", async () => {
    const test = harness();
    try {
      test.keys.set(
        "workout-storage",
        JSON.stringify({
          version: 2,
          state: {
            programs: [{ programId: "p", name: "Program", sessions: [] }],
          },
        }),
      );
      const first = await bootstrapLegacyConversion(test.options);
      expect(test.opens()).toBe(2);
      expect(
        test.db.prepare("SELECT state FROM bootstrap_state").get(),
      ).toEqual({ state: "ready" });
      expect(test.db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Program",
      });
      expect(
        JSON.parse(test.keys.get("activity-log-sqlite-cutover") ?? "null"),
      ).toEqual({ version: 1, databaseId: "database-id" });
      await first.close();
      test.keys.set("workout-storage", "invalid stale legacy data");
      await bootstrapLegacyConversion(test.options);
      expect(test.db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Program",
      });
      expect(test.opens()).toBe(3);
    } finally {
      test.db.close();
    }
  });

  it("finishes installing a receipt after a prior write failure without reimporting", async () => {
    const test = harness();
    try {
      test.failReceipt(true);
      await expect(bootstrapLegacyConversion(test.options)).rejects.toThrow(
        "receipt write failed",
      );
      expect(
        test.db.prepare("SELECT state FROM bootstrap_state").get(),
      ).toEqual({ state: "ready" });
      test.keys.set("workout-storage", "stale");
      test.failReceipt(false);
      await bootstrapLegacyConversion(test.options);
      expect(
        test.db
          .prepare("SELECT count(*) AS count FROM conversion_snapshots")
          .get(),
      ).toEqual({ count: 1 });
      expect(test.keys.has("activity-log-sqlite-cutover")).toBe(true);
    } finally {
      test.db.close();
    }
  });

  it("does not import stale legacy data when the retirement receipt exists but the target is missing", async () => {
    const test = harness();
    try {
      test.keys.set(
        "activity-log-sqlite-cutover",
        JSON.stringify({ version: 1, databaseId: "old" }),
      );
      test.keys.set("workout-storage", "old data");
      await expect(bootstrapLegacyConversion(test.options)).rejects.toThrow(
        "Recovery is required",
      );
      expect(
        test.db.prepare("SELECT count(*) AS count FROM bootstrap_state").get(),
      ).toEqual({ count: 0 });
    } finally {
      test.db.close();
    }
  });
});
