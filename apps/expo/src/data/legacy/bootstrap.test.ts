import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { transaction } from "../database/db";
import { nodeDb } from "../database/test-db";
import { defaultDomainData, replaceDomainData } from "../lifecycle/replace";
import { bootstrapDatabase } from "./bootstrap";

function harness() {
  const db = nodeDb(new DatabaseSync(":memory:"));
  db.execSync("PRAGMA foreign_keys = ON");
  const keys = new Map<string, string>();
  let failRemoval = false;
  const storage = {
    getItemSync: (key: string) => keys.get(key) ?? null,
    removeItemSync: (key: string) => {
      if (failRemoval) throw new Error("legacy removal failed");
      return keys.delete(key);
    },
  };
  return {
    db: db.raw,
    keys,
    bootstrap: () => bootstrapDatabase(db, storage),
    reset: () =>
      transaction(db, () => replaceDomainData(db, defaultDomainData())),
    failRemoval: (value: boolean) => {
      failRemoval = value;
    },
  };
}

describe("legacy conversion bootstrap", () => {
  it("imports the legacy stores once and ignores stale legacy data on restart", () => {
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
      test.keys.set(
        "exercise-storage",
        JSON.stringify({ version: 2, state: { exercises: [] } }),
      );
      test.keys.set("activity-log-restore-transaction", "{}");
      test.bootstrap();
      expect(test.db.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 1,
      });
      expect(test.db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Program",
      });
      expect(test.keys.size).toBe(0);
      test.keys.set("workout-storage", "invalid stale legacy data");
      test.bootstrap();
      expect(test.db.prepare("SELECT name FROM programs").all()).toEqual([
        { name: "Program" },
      ]);
    } finally {
      test.db.close();
    }
  });

  it("starts a new install with the default settings", () => {
    const test = harness();
    try {
      test.bootstrap();
      expect(
        test.db.prepare("SELECT count(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
      expect(
        (
          test.db
            .prepare("SELECT count(*) AS count FROM exercise_presets")
            .get() as { count: number }
        ).count,
      ).toBeGreaterThan(0);
    } finally {
      test.db.close();
    }
  });

  it("does not reimport after a reset and restart", () => {
    const test = harness();
    try {
      test.keys.set(
        "workout-storage",
        JSON.stringify({
          version: 2,
          state: { programs: [{ programId: "p", name: "Old", sessions: [] }] },
        }),
      );
      test.bootstrap();
      test.reset();
      test.bootstrap();
      expect(
        test.db.prepare("SELECT count(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
    } finally {
      test.db.close();
    }
  });

  it("retries failed legacy cleanup without repeating the import", () => {
    const test = harness();
    try {
      test.keys.set(
        "workout-storage",
        JSON.stringify({
          version: 2,
          state: {
            programs: [{ programId: "p", name: "Saved", sessions: [] }],
          },
        }),
      );
      test.failRemoval(true);
      expect(() => test.bootstrap()).toThrow("legacy removal failed");
      test.failRemoval(false);
      test.bootstrap();
      expect(test.keys.has("workout-storage")).toBe(false);
      expect(test.db.prepare("SELECT name FROM programs").all()).toEqual([
        { name: "Saved" },
      ]);
    } finally {
      test.db.close();
    }
  });

  it("keeps the legacy source and imports nothing when conversion fails", () => {
    const test = harness();
    try {
      test.keys.set("workout-storage", "invalid-json");
      expect(() => test.bootstrap()).toThrow();
      expect(test.keys.get("workout-storage")).toBe("invalid-json");
      expect(
        test.db.prepare("SELECT count(*) AS count FROM sqlite_master").get(),
      ).toEqual({ count: 0 });
    } finally {
      test.db.close();
    }
  });
});
