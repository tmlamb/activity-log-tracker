import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "./schema";

describe("relational schema", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_V1);

  afterEach(() => {
    db.exec(
      "DELETE FROM programs; DELETE FROM exercises; DELETE FROM barbells",
    );
  });

  it("preserves scoped IDs and cascades only through the deleted program", () => {
    db.exec(`
      INSERT INTO programs VALUES ('p1', 'First', 0), ('p2', 'Second', 1);
      INSERT INTO sessions(program_id, id, name, position, status, deload)
        VALUES ('p1', 'same', 'Session', 0, 'Done', 0),
               ('p2', 'same', 'Session', 0, 'Done', 0);
      INSERT INTO activities(program_id, session_id, id, position)
        VALUES ('p1', 'same', 'activity', 0), ('p2', 'same', 'activity', 0);
      INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
        VALUES ('p1', 'same', 'activity', 'set', 'Main', 0, 'Done', 'Neutral'),
               ('p2', 'same', 'activity', 'set', 'Main', 0, 'Done', 'Neutral');
      DELETE FROM programs WHERE id = 'p1';
    `);
    expect(db.prepare("SELECT program_id FROM workout_sets").all()).toEqual([
      { program_id: "p2" },
    ]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("rejects invalid foreign keys and incomplete weight pairs", () => {
    expect(() =>
      db.exec(
        "INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('missing', 's', 'S', 0, 'Done', 0)",
      ),
    ).toThrow();
    expect(() =>
      db.exec(
        "INSERT INTO exercises(id, name, normalized_name, position, one_rep_max_value) VALUES ('e', 'E', 'e', 0, 100)",
      ),
    ).toThrow();
  });

  it("enforces uniqueness only for active exercise names", () => {
    db.exec(
      "INSERT INTO exercises(id, name, normalized_name, position, deleted) VALUES ('old', 'Squat', 'squat', 0, 1)",
    );
    db.exec(
      "INSERT INTO exercises(id, name, normalized_name, position) VALUES ('active', 'Squat', 'squat', 1)",
    );
    expect(() =>
      db.exec(
        "INSERT INTO exercises(id, name, normalized_name, position) VALUES ('duplicate', 'Squat', 'squat', 2)",
      ),
    ).toThrow();
  });
});
