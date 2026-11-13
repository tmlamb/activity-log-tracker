import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { archiveLegacySource } from "./archive";
import { populateLegacyData, verifyAndMarkLegacyDataReady } from "./population";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string) =>
      Promise.resolve(db.prepare(sql).all() as T[]),
    prepareAsync: (sql: string) => {
      const statement = db.prepare(sql);
      return Promise.resolve({
        executeAsync: (...parameters: (string | number | null)[]) =>
          Promise.resolve(statement.run(...parameters)),
        finalizeAsync: () => Promise.resolve(),
      });
    },
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

describe("durable conversion", () => {
  it("verifies the captured data after closing and reopening SQLite", async () => {
    const directory = mkdtempSync(
      join(process.cwd(), ".sqlite-conversion-test-"),
    );
    const path = join(directory, "workouts.sqlite");
    let db = new DatabaseSync(path);
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} BEGIN IMMEDIATE`);
      const source = {
        workout: JSON.stringify({
          version: 2,
          state: {
            programs: [{ programId: "p", name: "Persistent", sessions: [] }],
          },
        }),
        exercises: JSON.stringify({ version: 2, state: { exercises: [] } }),
        restoreJournal: null,
      };
      await archiveLegacySource(adapter(db), source, "database", 100);
      db.exec("COMMIT; BEGIN IMMEDIATE");
      await populateLegacyData(adapter(db), 1);
      db.exec("COMMIT");
      db.close();

      db = new DatabaseSync(path);
      db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
      await verifyAndMarkLegacyDataReady(adapter(db), 1, 200);
      db.exec("COMMIT");
      expect(db.prepare("SELECT state FROM bootstrap_state").get()).toEqual({
        state: "ready",
      });
      expect(db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Persistent",
      });
    } finally {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
