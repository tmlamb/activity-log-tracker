import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { ExerciseInput } from "./exercises";
import { SCHEMA_V1 } from "../database/schema";
import {
  createExercise,
  editExercise,
  getSavedExercise,
  isExerciseUsed,
  listSavedExercises,
  setExerciseDeleted,
  setExerciseNotes,
} from "./exercises";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve(db.prepare(sql).all(...parameters) as T[]),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

const exercise: ExerciseInput = {
  name: "  Bench   Press ",
  loadKind: "BARBELL",
  barbellId: null,
  oneRepMax: { value: 100, unit: "kg" },
  primaryMuscles: ["Chest", "Triceps"],
  notes: "Notes",
};

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} BEGIN IMMEDIATE`);
  return db;
}

describe("saved exercises", () => {
  it("creates and lists exercises with ordered muscle labels", async () => {
    const db = setup();
    try {
      await createExercise(adapter(db), "e", exercise);
      const expected = {
        id: "e",
        name: "Bench Press",
        loadKind: "BARBELL",
        barbellId: null,
        oneRepMax: { value: 100, unit: "kg" },
        primaryMuscles: ["Chest", "Triceps"],
        notes: "Notes",
        deleted: false,
        revision: 0,
      };
      expect(await getSavedExercise(adapter(db), "e")).toEqual(expected);
      expect(await listSavedExercises(adapter(db))).toEqual([expected]);
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  });

  it("protects live workouts when an exercise is deleted and checks restore conflicts", async () => {
    const db = setup();
    try {
      await createExercise(adapter(db), "old", exercise);
      db.exec(`INSERT INTO programs VALUES ('p', 'P', 0);
        INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('p', 's', 'S', 0, 'Done', 0);
        INSERT INTO activities(program_id, session_id, id, exercise_id, position) VALUES ('p', 's', 'a', 'old', 0);`);
      expect(await isExerciseUsed(adapter(db), "old")).toBe(true);
      await setExerciseDeleted(adapter(db), "old", true);
      await createExercise(adapter(db), "replacement", exercise);
      await expect(
        setExerciseDeleted(adapter(db), "old", false),
      ).rejects.toThrow("name already exists");
      expect(db.prepare("SELECT exercise_id FROM activities").get()).toEqual({
        exercise_id: "old",
      });
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  });

  it("rejects stale edits and makes notes-only changes without rewriting muscles", async () => {
    const db = setup();
    try {
      await createExercise(adapter(db), "e", exercise);
      expect(await setExerciseNotes(adapter(db), "e", "Changed")).toBe(true);
      expect(await setExerciseNotes(adapter(db), "e", "Changed")).toBe(false);
      await expect(editExercise(adapter(db), "e", 0, exercise)).rejects.toThrow(
        "exercise changed",
      );
      expect(
        (await getSavedExercise(adapter(db), "e"))?.primaryMuscles,
      ).toEqual(["Chest", "Triceps"]);
      await editExercise(adapter(db), "e", 1, {
        ...exercise,
        primaryMuscles: ["Shoulders"],
      });
      expect(
        (await getSavedExercise(adapter(db), "e"))?.primaryMuscles,
      ).toEqual(["Shoulders"]);
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  });
});
