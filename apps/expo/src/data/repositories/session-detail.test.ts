import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { getSessionDetail } from "./session-detail";

describe("session detail query", () => {
  it("loads a single ordered session with a bounded number of queries", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
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
                 ('p', 'other', 'first', 'other-set', 'Main', 0, 'Done', 'Neutral');
        BEGIN`);
      let count = 0;
      const reader = {
        getFirstAsync: <T>(sql: string, ...parameters: string[]) => {
          count++;
          return Promise.resolve(
            (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
          );
        },
        getAllAsync: <T>(sql: string, ...parameters: string[]) => {
          count++;
          return Promise.resolve(db.prepare(sql).all(...parameters) as T[]);
        },
      };
      const result = await getSessionDetail(reader, "p", "s");
      db.exec("COMMIT");
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
      expect(await getSessionDetail(reader, "p", "missing")).toBeNull();
      expect(count).toBe(4);
    } finally {
      db.close();
    }
  });
});
