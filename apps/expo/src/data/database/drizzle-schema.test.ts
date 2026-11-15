import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "./schema";

const generated = readFileSync(
  new URL("../../../drizzle/0000_lumpy_katie_power.sql", import.meta.url),
  "utf8",
);

describe("Drizzle schema migration", () => {
  it("preserves columns, foreign keys, and index definitions of the current schema", () => {
    const current = new DatabaseSync(":memory:");
    const next = new DatabaseSync(":memory:");
    try {
      current.exec(SCHEMA_V1);
      next.exec(generated);
      const tables = current
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        )
        .all() as { name: string }[];
      expect(
        next
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
          )
          .all(),
      ).toEqual(tables);
      const nullabilityDifferences: string[] = [];
      for (const { name } of tables) {
        const quote = `"${name.replaceAll('"', '""')}"`;
        const columns = (db: DatabaseSync) =>
          (
            db.prepare(`PRAGMA table_info(${quote})`).all() as {
              name: string;
              type: string;
              pk: number;
              notnull: number;
              dflt_value: string | null;
            }[]
          ).map(({ name: column, type, pk, dflt_value }) => ({
            column,
            type,
            pk,
            dflt_value,
          }));
        expect(columns(next), name).toEqual(columns(current));
        const nullability = (db: DatabaseSync) =>
          db.prepare(`PRAGMA table_info(${quote})`).all() as {
            name: string;
            notnull: number;
          }[];
        const before = nullability(current);
        const after = nullability(next);
        before.forEach((column, index) => {
          if (column.notnull !== after[index]?.notnull)
            nullabilityDifferences.push(`${name}.${column.name}`);
        });
        const foreignKeys = (db: DatabaseSync) =>
          (
            db.prepare(`PRAGMA foreign_key_list(${quote})`).all() as {
              table: string;
              from: string;
              to: string;
              on_delete: string;
              seq: number;
            }[]
          )
            .map(({ table, from, to, on_delete, seq }) => ({
              table,
              from,
              to,
              on_delete,
              seq,
            }))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        expect(foreignKeys(next), name).toEqual(foreignKeys(current));
        const indexes = (db: DatabaseSync) =>
          (
            db.prepare(`PRAGMA index_list(${quote})`).all() as {
              name: string;
              unique: number;
              partial: number;
            }[]
          )
            .map((item) => ({
              unique: item.unique,
              partial: item.partial,
              columns: (
                db
                  .prepare(
                    `PRAGMA index_info("${item.name.replaceAll('"', '""')}")`,
                  )
                  .all() as { name: string }[]
              ).map((column) => column.name),
            }))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        expect(indexes(next), name).toEqual(indexes(current));
      }
      // SQLite's handwritten inline PRIMARY KEY columns omit explicit NOT NULL.
      // Do not silently apply Drizzle's stronger baseline to existing users.
      expect(nullabilityDifferences).toEqual([
        "barbells.id",
        "bootstrap_state.singleton",
        "conversion_reports.id",
        "conversion_snapshots.id",
        "exercise_presets.id",
        "exercises.id",
        "lifecycle_operations.id",
        "muscle_catalog.position",
        "muscle_labels.id",
        "plates.id",
        "programs.id",
        "schema_migrations.version",
      ]);
    } finally {
      current.close();
      next.close();
    }
  });

  it.each([SCHEMA_V1, generated])(
    "enforces relational and domain constraints on either schema",
    (schema) => {
      const db = new DatabaseSync(":memory:");
      try {
        db.exec(`PRAGMA foreign_keys = ON; ${schema}`);
        db.exec(`INSERT INTO programs VALUES ('p', 'P', 0);
        INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('p', 's', 'S', 0, 'Done', 0);
        INSERT INTO exercises(id, name, normalized_name, position) VALUES ('e', 'E', 'e', 0);
        INSERT INTO activities(program_id, session_id, id, exercise_id, position) VALUES ('p', 's', 'a', 'e', 0);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback) VALUES ('p', 's', 'a', 'set', 'Main', 0, 'Done', 'Neutral');`);
        for (const invalid of [
          "INSERT INTO programs VALUES (' ', 'bad', 1)",
          "UPDATE sessions SET status = 'Unknown'",
          "UPDATE sessions SET deload = 2",
          "UPDATE exercises SET one_rep_max_value = 10",
          "UPDATE activities SET load_type = 'RPE'",
          "UPDATE workout_sets SET weight_value = 10",
          "UPDATE workout_sets SET feedback = 'Unknown'",
          "INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('missing', 's', 'S', 0, 'Done', 0)",
          "INSERT INTO exercises(id, name, normalized_name, position) VALUES ('duplicate', 'E', 'e', 1)",
        ])
          expect(() => db.exec(invalid), invalid).toThrow();
        db.exec("DELETE FROM programs WHERE id = 'p'");
        expect(
          db.prepare("SELECT COUNT(*) AS count FROM workout_sets").get(),
        ).toEqual({ count: 0 });
        expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        db.close();
      }
    },
  );
});
