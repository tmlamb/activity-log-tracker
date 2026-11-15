import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

import { migrateSchema } from "./migrations";
import { SCHEMA_V1 } from "./schema";

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
        user_version: 2,
      });
      expect(db.prepare("SELECT version FROM schema_migrations").all()).toEqual(
        [{ version: 1 }, { version: 2 }],
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

  it("upgrades an existing version-1 dataset without changing its records", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`${SCHEMA_V1}
        INSERT INTO schema_migrations VALUES (1, 123);
        INSERT INTO programs VALUES ('p', 'Saved program', 0);
        PRAGMA user_version = 1; BEGIN IMMEDIATE;`);
      await migrateSchema(transactionFor(db));
      db.exec("COMMIT");
      expect(db.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 2,
      });
      expect(
        db.prepare("SELECT id, name, position FROM programs").get(),
      ).toEqual({ id: "p", name: "Saved program", position: 0 });
      expect(
        db
          .prepare("SELECT version FROM schema_migrations ORDER BY version")
          .all(),
      ).toEqual([{ version: 1 }, { version: 2 }]);
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'sessions_lineage_completed_chrono'",
          )
          .get(),
      ).toEqual({ name: "sessions_lineage_completed_chrono" });
    } finally {
      db.close();
    }
  });

  it("keeps the reviewed Drizzle index migration executable and equivalent to the runtime migration", async () => {
    const generated = readFileSync(
      new URL(
        "../../../drizzle/0001_certain_stark_industries.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const runtimeDb = new DatabaseSync(":memory:");
    const generatedDb = new DatabaseSync(":memory:");
    try {
      runtimeDb.exec(`${SCHEMA_V1} PRAGMA user_version = 1; BEGIN IMMEDIATE;`);
      await migrateSchema(transactionFor(runtimeDb));
      runtimeDb.exec("COMMIT");
      generatedDb.exec(`${SCHEMA_V1} ${generated}`);
      const definition = (db: DatabaseSync) =>
        db
          .prepare("PRAGMA index_xinfo('sessions_lineage_completed_chrono')")
          .all();
      expect(definition(generatedDb)).toEqual(definition(runtimeDb));
      const plan = (db: DatabaseSync) =>
        db
          .prepare(
            `EXPLAIN QUERY PLAN SELECT id FROM sessions
        WHERE program_id = 'p' AND lineage_id = 'l' AND status = 'Done'
        ORDER BY COALESCE(start_ms, end_ms, 0) DESC, position DESC LIMIT 1`,
          )
          .all();
      expect(plan(generatedDb)).toEqual(plan(runtimeDb));
    } finally {
      runtimeDb.close();
      generatedDb.close();
    }
  });
});
