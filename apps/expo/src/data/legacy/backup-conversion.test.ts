import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  parseActivityLogBackup,
  serializeActivityLogBackup,
} from "~/utils/app-data-backup";
import { createTestDb } from "../database/test-db";
import { prepareLegacyConversion } from "./conversion";
import { insertConvertedData } from "./population";

function verifyBackupConversion(contents: string) {
  const stores = parseActivityLogBackup(contents);
  const workout = stores["workout-storage"];
  const sessions = workout.programs.flatMap((program) => program.sessions);
  const activities = sessions.flatMap((session) => session.activities);
  const expected = {
    programs: workout.programs.length,
    sessions: sessions.length,
    activities: activities.length,
    workout_sets: activities.reduce(
      (total, activity) =>
        total + activity.warmupSets.length + activity.mainSets.length,
      0,
    ),
    exercises: workout.exercises.length,
    exercise_presets: stores["exercise-storage"].exercises.length,
    barbells: workout.equipment.barbells.length,
    plates: workout.equipment.plates.length,
  };
  const db = createTestDb();
  const conversion = prepareLegacyConversion({
    workout: JSON.stringify({ version: 2, state: workout }),
    exercises: JSON.stringify({
      version: 2,
      state: stores["exercise-storage"],
    }),
  });
  insertConvertedData(db, conversion);
  expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  for (const [table, count] of Object.entries(expected))
    expect(
      db.raw.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
    ).toEqual({ count });
  db.raw.close();
  return { counts: expected };
}

describe("portable backup conversion dry run", () => {
  it("converts and verifies a representative official backup", () => {
    const backup = serializeActivityLogBackup({
      "workout-storage": {
        programs: [
          {
            programId: "p",
            name: "Program",
            sessions: [
              {
                sessionId: "s",
                name: "Session",
                deload: false,
                status: "Done",
                activities: [
                  {
                    activityId: "a",
                    exerciseId: "e",
                    reps: 5,
                    rest: 2,
                    load: { type: "RPE", value: 8 },
                    warmupSets: [],
                    mainSets: [
                      {
                        workoutSetId: "set",
                        type: "Main",
                        status: "Done",
                        feedback: "Neutral",
                        actualReps: 5,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        exercises: [
          { exerciseId: "e", name: "Exercise", loadKind: "SINGLE_WEIGHT" },
        ],
        equipment: { barbells: [], plates: [] },
        muscleGroups: [],
      },
      "exercise-storage": { exercises: [] },
    });
    expect(verifyBackupConversion(backup)).toMatchObject({
      counts: {
        programs: 1,
        sessions: 1,
        activities: 1,
        workout_sets: 1,
        exercises: 1,
      },
    });
  });

  it("converts and verifies the historical backup fixture", () => {
    const backup = readFileSync(
      new URL("./fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );
    expect(verifyBackupConversion(backup)).toMatchObject({
      counts: {
        programs: 1,
        sessions: 1,
        activities: 1,
        workout_sets: 2,
        exercises: 1,
        exercise_presets: 1,
        barbells: 1,
        plates: 1,
      },
    });
  });
});
