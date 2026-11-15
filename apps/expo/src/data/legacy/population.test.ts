import { describe, expect, it } from "vitest";

import { createTestDb } from "../database/test-db";
import { prepareLegacyConversion } from "./conversion";
import { insertConvertedData } from "./population";

function fixture() {
  return {
    workout: JSON.stringify({
      version: 2,
      state: {
        equipment: {
          barbells: [{ barbellId: "1", value: 45, unit: "lbs" }],
          plates: [],
        },
        exercises: [
          {
            exerciseId: "e",
            name: "Squat",
            loadKind: "BARBELL",
            barbellId: "1",
            primaryMuscles: ["Quads"],
          },
        ],
        muscleGroups: ["Quads"],
        programs: [
          {
            programId: "p",
            name: "P",
            sessions: [
              {
                sessionId: "s",
                name: "S",
                status: "Done",
                deload: false,
                activities: [
                  {
                    activityId: "a",
                    exerciseId: "e",
                    reps: 5,
                    rest: 2,
                    load: { type: "RPE", value: "8" },
                    warmupSets: [],
                    mainSets: [
                      {
                        workoutSetId: "set",
                        type: "Main",
                        status: "Done",
                        feedback: "Hard",
                        actualReps: 5,
                        weight: { value: 100, unit: "lbs" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    }),
    exercises: JSON.stringify({ version: 2, state: { exercises: [] } }),
  };
}

describe("conversion population", () => {
  it("imports all dependent records", () => {
    const db = createTestDb();
    insertConvertedData(db, prepareLegacyConversion(fixture()));
    expect(
      db.raw
        .prepare("SELECT actual_reps, weight_value FROM workout_sets")
        .get(),
    ).toEqual({ actual_reps: 5, weight_value: 100 });
    expect(
      db.raw.prepare("SELECT load_type, load_value FROM activities").get(),
    ).toEqual({ load_type: "RPE", load_value: 8 });
    expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.raw.close();
  });

  it("refuses to insert into tables that already hold data", () => {
    const db = createTestDb("INSERT INTO programs VALUES ('x', 'X', 0);");
    expect(() =>
      insertConvertedData(db, prepareLegacyConversion(fixture())),
    ).toThrow("not empty");
    db.raw.close();
  });
});
