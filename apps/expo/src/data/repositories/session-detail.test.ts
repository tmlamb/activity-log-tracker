import { describe, expect, it } from "vitest";

import type { Db } from "../database/db";
import { createTestDb } from "../database/test-db";
import { getSessionDetail } from "./session-detail";

describe("session detail query", () => {
  it("loads a single ordered session with a bounded number of queries", () => {
    const db = createTestDb(`
      INSERT INTO programs VALUES ('p', 'Program', 0);
      INSERT INTO sessions(program_id, id, name, position, status, deload)
        VALUES ('p', 's', 'Selected', 0, 'Done', 1), ('p', 'other', 'Other', 1, 'Done', 0);
      INSERT INTO exercises(id, name, normalized_name, position, deleted)
        VALUES ('e', 'Deleted exercise', 'deletedexercise', 0, 1);
      INSERT INTO activities(program_id, session_id, id, exercise_id, position)
        VALUES ('p', 's', 'second', NULL, 1), ('p', 's', 'first', 'e', 0), ('p', 'other', 'first', 'e', 0);
      INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
        VALUES ('p', 's', 'first', 'm2', 'Main', 1, 'Done', 'Hard'),
               ('p', 's', 'first', 'w1', 'Warmup', 0, 'Done', 'Easy'),
               ('p', 's', 'first', 'm1', 'Main', 0, 'Done', 'Neutral'),
               ('p', 'other', 'first', 'other-set', 'Main', 0, 'Done', 'Neutral');`);
    try {
      let count = 0;
      const reader: Db = {
        ...db,
        getFirstSync: (sql, ...parameters) => {
          count++;
          return db.getFirstSync(sql, ...parameters);
        },
        getAllSync: (sql, ...parameters) => {
          count++;
          return db.getAllSync(sql, ...parameters);
        },
      };
      const result = getSessionDetail(reader, "p", "s");
      expect(count).toBe(3);
      expect(result).toMatchObject({
        id: "s",
        deload: true,
        activities: [
          {
            id: "first",
            exerciseName: "Deleted exercise",
            exerciseDeleted: true,
            warmupSets: [{ id: "w1" }],
            mainSets: [{ id: "m1" }, { id: "m2" }],
          },
          { id: "second", exerciseName: null, warmupSets: [], mainSets: [] },
        ],
      });
      expect(getSessionDetail(reader, "p", "missing")).toBeNull();
      expect(count).toBe(4);
    } finally {
      db.raw.close();
    }
  });
});
