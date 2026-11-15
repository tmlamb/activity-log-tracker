import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

import { prepareApplicationRestore } from "../backup/prepare-restore";
import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import { defaultDomainData, replaceDomainData } from "./replace";

function setup() {
  return createTestDb(`
    INSERT INTO programs VALUES ('p', 'Existing', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('p', 's', 'S', 0, 'Done', 0);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback) VALUES ('p', 's', 'a', 'set', 'Main', 0, 'Done', 'Neutral');`);
}

const count = (db: ReturnType<typeof setup>, table: string) =>
  (
    db.raw.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
      count: number;
    }
  ).count;

describe("dataset replacement", () => {
  it("resets user data to the defaults", () => {
    const db = setup();
    const defaults = defaultDomainData();
    transaction(db, () => replaceDomainData(db, defaults));
    for (const table of ["programs", "sessions", "activities", "workout_sets"])
      expect(count(db, table), table).toBe(0);
    expect(count(db, "barbells")).toBe(defaults.settings.barbells.length);
    expect(count(db, "plates")).toBe(defaults.settings.plates.length);
    expect(count(db, "exercise_presets")).toBe(
      defaults.settings.presets.length,
    );
    expect(count(db, "muscle_catalog")).toBe(defaults.settings.catalog.length);
    expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.raw.close();
  });

  it("restores a version-1 backup", () => {
    const db = setup();
    const prepared = prepareApplicationRestore(
      readFileSync(
        new URL("../legacy/fixtures/backup-v1.json", import.meta.url),
        "utf8",
      ),
    );
    transaction(db, () => replaceDomainData(db, prepared));
    expect(count(db, "programs")).toBe(prepared.history.programs.length);
    expect(count(db, "workout_sets")).toBe(prepared.history.sets.length);
    expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.raw.close();
  });

  it("keeps the previous data when the replacement fails", () => {
    const db = setup();
    db.raw.exec(
      "CREATE TRIGGER reject BEFORE INSERT ON barbells BEGIN SELECT RAISE(ABORT, 'disk full'); END",
    );
    expect(() =>
      transaction(db, () => replaceDomainData(db, defaultDomainData())),
    ).toThrow("disk full");
    expect(db.raw.prepare("SELECT name FROM programs").get()).toEqual({
      name: "Existing",
    });
    expect(count(db, "workout_sets")).toBe(1);
    db.raw.close();
  });
});
