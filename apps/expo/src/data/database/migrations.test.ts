import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { transaction } from "./db";
import { migrateDatabase, MIGRATIONS } from "./migrations";
import { nodeDb } from "./test-db";

const steps = [
  "CREATE TABLE programs (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
  "ALTER TABLE programs ADD COLUMN notes TEXT",
  "CREATE INDEX programs_name ON programs(name)",
];

function emptyDb() {
  return nodeDb(new DatabaseSync(":memory:"));
}

const version = (db: ReturnType<typeof emptyDb>) =>
  (db.raw.prepare("PRAGMA user_version").get() as { user_version: number })
    .user_version;

describe("schema migrations", () => {
  it("creates the app schema on a new database", () => {
    const db = emptyDb();
    expect(transaction(db, () => migrateDatabase(db))).toBe(0);
    expect(version(db)).toBe(MIGRATIONS.length);
    expect(
      db.raw
        .prepare("SELECT name FROM sqlite_master WHERE name = 'workout_sets'")
        .get(),
    ).toEqual({ name: "workout_sets" });
    db.raw.close();
  });

  it("runs only the steps an existing database is missing and keeps its data", () => {
    const db = emptyDb();
    migrateDatabase(db, steps.slice(0, 1));
    db.raw.exec("INSERT INTO programs VALUES ('p', 'Strength')");

    expect(transaction(db, () => migrateDatabase(db, steps))).toBe(1);
    expect(version(db)).toBe(3);
    expect(db.raw.prepare("SELECT * FROM programs").all()).toEqual([
      { id: "p", name: "Strength", notes: null },
    ]);

    // Already current: nothing runs, so re-adding the column can't fail.
    expect(migrateDatabase(db, steps)).toBe(3);
    db.raw.close();
  });

  it("refuses a database written by a newer app", () => {
    const db = emptyDb();
    db.raw.exec("PRAGMA user_version = 4");
    expect(() => migrateDatabase(db, steps)).toThrow("newer app version");
    db.raw.close();
  });

  it("leaves the database unchanged when a step fails", () => {
    const db = emptyDb();
    migrateDatabase(db, steps.slice(0, 1));
    expect(() =>
      transaction(db, () =>
        migrateDatabase(db, [...steps.slice(0, 2), "NOT VALID SQL"]),
      ),
    ).toThrow();
    expect(version(db)).toBe(1);
    expect(
      db.raw.prepare("SELECT name FROM pragma_table_info('programs')").all(),
    ).toEqual([{ name: "id" }, { name: "name" }]);
    db.raw.close();
  });
});
