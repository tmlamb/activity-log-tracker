import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { archiveLegacySource } from "./archive";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(sql: string, ...parameters: (string | number)[]) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve(db.prepare(sql).run(...parameters)),
  };
}

describe("legacy source archive", () => {
  it("reuses the captured bytes on retry even when the source has changed", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} BEGIN IMMEDIATE`);
      const first = await archiveLegacySource(
        adapter(db),
        { workout: "workout", exercises: null, restoreJournal: null },
        "database-1",
        100,
      );
      db.exec("COMMIT; BEGIN IMMEDIATE");
      const retried = await archiveLegacySource(
        adapter(db),
        { workout: "changed", exercises: "changed", restoreJournal: null },
        "database-2",
        200,
      );
      db.exec("COMMIT");
      expect(retried).toEqual(first);
      expect(retried.source).toEqual({ workout: "workout", exercises: null });
      expect(
        db.prepare("SELECT count(*) AS count FROM conversion_snapshots").get(),
      ).toEqual({ count: 1 });
    } finally {
      db.close();
    }
  });

  it("refuses to capture a malformed restore journal", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`${SCHEMA_V1} BEGIN IMMEDIATE`);
      await expect(
        archiveLegacySource(
          adapter(db),
          { workout: "one", exercises: "two", restoreJournal: "{" },
          "database",
          100,
        ),
      ).rejects.toThrow("journal is invalid");
      db.exec("ROLLBACK");
      expect(
        db.prepare("SELECT count(*) AS count FROM bootstrap_state").get(),
      ).toEqual({ count: 0 });
    } finally {
      db.close();
    }
  });

  it("cannot replace an already verified dataset with legacy data", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(
        `${SCHEMA_V1} INSERT INTO bootstrap_state(singleton, database_id, state) VALUES (1, 'db', 'ready'); BEGIN IMMEDIATE`,
      );
      await expect(
        archiveLegacySource(
          adapter(db),
          { workout: "old", exercises: null, restoreJournal: null },
          "other",
          100,
        ),
      ).rejects.toThrow("already moved past source capture");
      db.exec("ROLLBACK");
    } finally {
      db.close();
    }
  });
});
