import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { migrateSchema } from "./migrations";

function transactionFor(db: DatabaseSync) {
  return {
    execAsync: (sql: string) => {
      db.exec(sql);
      return Promise.resolve();
    },
    getFirstAsync: <T>(sql: string) =>
      Promise.resolve((db.prepare(sql).get() as T | undefined) ?? null),
  };
}

describe("schema migrations", () => {
  it("creates the schema and version atomically and can run again", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("BEGIN IMMEDIATE");
      await migrateSchema(transactionFor(db));
      db.exec("COMMIT");
      expect(db.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 1,
      });
      expect(db.prepare("SELECT version FROM schema_migrations").all()).toEqual(
        [{ version: 1 }],
      );
      db.exec("BEGIN IMMEDIATE");
      await migrateSchema(transactionFor(db));
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  });

  it("does not modify a database from a newer version", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("PRAGMA user_version = 99; BEGIN IMMEDIATE");
      await expect(migrateSchema(transactionFor(db))).rejects.toThrow(
        "newer app version",
      );
      db.exec("ROLLBACK");
      expect(db.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 99,
      });
    } finally {
      db.close();
    }
  });
});
