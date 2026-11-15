import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { createTransactionQueue } from "../database/transactions";
import { prepareLegacyConversion } from "../legacy/conversion";
import { resetApplicationData } from "./reset";
import { prepareVersion1Restore, restoreVersion1Data } from "./restore-v1";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO bootstrap_state VALUES (1, 'db', 'ready', 7);
    INSERT INTO conversion_snapshots VALUES (1, 'private workout', 'private exercise', NULL, 100);
    INSERT INTO conversion_reports VALUES (1, 1, 1, 'private report', 101);
    INSERT INTO programs VALUES ('p', 'Existing', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('p', 's', 'S', 0, 'Done', 0);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback) VALUES ('p', 's', 'a', 'set', 'Main', 0, 'Done', 'Neutral');`);
  let failInsert = false;
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
        executeAsync: (...parameters: (string | number | null)[]) => {
          if (failInsert) throw new Error("simulated storage failure");
          return Promise.resolve(statement.run(...parameters));
        },
        finalizeAsync: () => Promise.resolve(),
      });
    },
  };
  const write = createTransactionQueue(transaction, "BEGIN IMMEDIATE");
  return {
    db,
    write,
    setFailure: (value: boolean) => {
      failInsert = value;
    },
  };
}

describe("atomic application reset", () => {
  it("replaces user data with defaults, removes private archive, and preserves readiness and identity", async () => {
    const { db, write } = setup();
    try {
      expect(await write((tx) => resetApplicationData(tx, 7))).toBe(8);
      expect(db.prepare("SELECT * FROM bootstrap_state").get()).toEqual({
        singleton: 1,
        database_id: "db",
        state: "ready",
        generation: 8,
      });
      for (const table of [
        "programs",
        "sessions",
        "activities",
        "workout_sets",
        "conversion_snapshots",
        "conversion_reports",
      ])
        expect(
          db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
          table,
        ).toEqual({ count: 0 });
      const defaults = prepareLegacyConversion({
        workout: null,
        exercises: null,
      });
      for (const [table, count] of [
        ["barbells", defaults.settings.barbells.length],
        ["plates", defaults.settings.plates.length],
        ["exercise_presets", defaults.settings.presets.length],
        ["muscle_catalog", defaults.settings.catalog.length],
      ] as const)
        expect(
          db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
          table,
        ).toEqual({ count });
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      await expect(write((tx) => resetApplicationData(tx, 7))).rejects.toThrow(
        "dataset has changed",
      );
      expect(await write((tx) => resetApplicationData(tx, 8))).toBe(9);
    } finally {
      db.close();
    }
  });

  it("rolls back deletions, defaults, archive and generation after a failed write", async () => {
    const { db, write, setFailure } = setup();
    try {
      setFailure(true);
      await expect(write((tx) => resetApplicationData(tx, 7))).rejects.toThrow(
        "simulated storage failure",
      );
      expect(
        db.prepare("SELECT generation FROM bootstrap_state").get(),
      ).toEqual({ generation: 7 });
      expect(db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Existing",
      });
      expect(
        db.prepare("SELECT workout FROM conversion_snapshots").get(),
      ).toEqual({ workout: "private workout" });
      expect(db.prepare("SELECT id FROM workout_sets").get()).toEqual({
        id: "set",
      });
      setFailure(false);
      expect(await write((tx) => resetApplicationData(tx, 7))).toBe(8);
    } finally {
      db.close();
    }
  });

  it("refuses to reset an unverified target", async () => {
    const { db, write } = setup();
    try {
      db.exec("UPDATE bootstrap_state SET state = 'awaiting-verification'");
      await expect(write((tx) => resetApplicationData(tx, 7))).rejects.toThrow(
        "dataset has changed",
      );
      expect(db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Existing",
      });
    } finally {
      db.close();
    }
  });
});

describe("atomic version-1 backup restore", () => {
  const backup = readFileSync(
    new URL("../legacy/fixtures/backup-v1.json", import.meta.url),
    "utf8",
  );

  it("validates before replacement and preserves migration archive and database identity", async () => {
    const { db, write } = setup();
    try {
      expect(() => prepareVersion1Restore("not json")).toThrow();
      expect(db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Existing",
      });
      const prepared = prepareVersion1Restore(backup);
      expect(await write((tx) => restoreVersion1Data(tx, 7, prepared))).toBe(8);
      expect(
        db
          .prepare("SELECT database_id, state, generation FROM bootstrap_state")
          .get(),
      ).toEqual({
        database_id: "db",
        state: "ready",
        generation: 8,
      });
      expect(
        db.prepare("SELECT workout FROM conversion_snapshots").get(),
      ).toEqual({ workout: "private workout" });
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM programs").get(),
      ).toEqual({ count: prepared.history.programs.length });
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM workout_sets").get(),
      ).toEqual({ count: prepared.history.sets.length });
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      await expect(
        write((tx) => restoreVersion1Data(tx, 7, prepared)),
      ).rejects.toThrow("dataset has changed");
    } finally {
      db.close();
    }
  });

  it("leaves previous data intact on a failed restore and permits retry", async () => {
    const { db, write, setFailure } = setup();
    try {
      const prepared = prepareVersion1Restore(backup);
      setFailure(true);
      await expect(
        write((tx) => restoreVersion1Data(tx, 7, prepared)),
      ).rejects.toThrow("simulated storage failure");
      expect(db.prepare("SELECT name FROM programs").get()).toEqual({
        name: "Existing",
      });
      expect(
        db.prepare("SELECT generation FROM bootstrap_state").get(),
      ).toEqual({ generation: 7 });
      expect(db.prepare("SELECT id FROM workout_sets").get()).toEqual({
        id: "set",
      });
      setFailure(false);
      expect(await write((tx) => restoreVersion1Data(tx, 7, prepared))).toBe(8);
    } finally {
      db.close();
    }
  });
});
