import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { populateLegacyData, verifyAndMarkLegacyDataReady } from "./population";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string) =>
      Promise.resolve(db.prepare(sql).all() as T[]),
    prepareAsync: (sql: string) => {
      const statement = db.prepare(sql);
      return Promise.resolve({
        executeAsync: (...parameters: (string | number | null)[]) =>
          Promise.resolve(statement.run(...parameters)),
        finalizeAsync: () => Promise.resolve(),
      });
    },
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

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

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO bootstrap_state(singleton, database_id, state) VALUES (1, 'db', 'source-captured');`);
  const source = fixture();
  db.prepare(
    "INSERT INTO conversion_snapshots(id, workout, exercises, captured_at) VALUES (1, ?, ?, 100)",
  ).run(source.workout, source.exercises);
  return db;
}

describe("conversion population", () => {
  it("imports all dependent records and verifies before readiness", async () => {
    const db = setup();
    try {
      db.exec("BEGIN IMMEDIATE");
      await populateLegacyData(adapter(db), 1);
      db.exec("COMMIT");
      expect(db.prepare("SELECT state FROM bootstrap_state").get()).toEqual({
        state: "awaiting-verification",
      });
      db.exec("BEGIN IMMEDIATE");
      await verifyAndMarkLegacyDataReady(adapter(db), 1, 200);
      db.exec("COMMIT");
      expect(db.prepare("SELECT state FROM bootstrap_state").get()).toEqual({
        state: "ready",
      });
      expect(
        db.prepare("SELECT actual_reps, weight_value FROM workout_sets").get(),
      ).toEqual({ actual_reps: 5, weight_value: 100 });
      expect(
        db.prepare("SELECT verified_at FROM conversion_reports").get(),
      ).toEqual({ verified_at: 200 });
    } finally {
      db.close();
    }
  });

  it("detects changed data during verification and leaves the target unready", async () => {
    const db = setup();
    try {
      db.exec("BEGIN IMMEDIATE");
      await populateLegacyData(adapter(db), 1);
      db.exec("COMMIT; UPDATE programs SET name = 'wrong'; BEGIN IMMEDIATE");
      await expect(
        verifyAndMarkLegacyDataReady(adapter(db), 1, 200),
      ).rejects.toThrow("verification failed for programs");
      db.exec("ROLLBACK");
      expect(db.prepare("SELECT state FROM bootstrap_state").get()).toEqual({
        state: "awaiting-verification",
      });
    } finally {
      db.close();
    }
  });

  it("rolls back all records if an insert fails", async () => {
    const db = setup();
    try {
      const transaction = adapter(db);
      let finalized = false;
      const failing = {
        ...transaction,
        prepareAsync: (sql: string) =>
          sql.startsWith("INSERT INTO workout_sets")
            ? Promise.resolve({
                executeAsync: () => Promise.reject(new Error("disk full")),
                finalizeAsync: () => {
                  finalized = true;
                  return Promise.resolve();
                },
              })
            : transaction.prepareAsync(sql),
      };
      db.exec("BEGIN IMMEDIATE");
      await expect(populateLegacyData(failing, 1)).rejects.toThrow("disk full");
      db.exec("ROLLBACK");
      expect(finalized).toBe(true);
      expect(
        db.prepare("SELECT count(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
      expect(db.prepare("SELECT state FROM bootstrap_state").get()).toEqual({
        state: "source-captured",
      });
    } finally {
      db.close();
    }
  });
});
