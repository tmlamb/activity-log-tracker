import { describe, expect, it } from "vitest";

import type { ExerciseInput } from "./exercises";
import { createTestDb } from "../database/test-db";
import {
  createExercise,
  editExercise,
  getSavedExercise,
  isExerciseUsed,
  listSavedExercises,
  setExerciseDeleted,
  setExerciseNotes,
  setExerciseOneRepMax,
} from "./exercises";

const exercise: ExerciseInput = {
  name: "  Bench   Press ",
  loadKind: "BARBELL",
  barbellId: null,
  oneRepMax: { value: 100, unit: "kg" },
  primaryMuscles: ["Chest", "Triceps"],
  notes: "Notes",
};

function setup() {
  return createTestDb();
}

describe("saved exercises", () => {
  it("creates and lists exercises with ordered muscle labels", () => {
    const db = setup();
    try {
      createExercise(db, "e", exercise);
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
      expect(getSavedExercise(db, "e")).toEqual(expected);
      expect(listSavedExercises(db)).toEqual([expected]);
    } finally {
      db.raw.close();
    }
  });

  it("protects live workouts when an exercise is deleted and checks restore conflicts", () => {
    const db = setup();
    try {
      createExercise(db, "old", exercise);
      db.raw.exec(`INSERT INTO programs VALUES ('p', 'P', 0);
        INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('p', 's', 'S', 0, 'Done', 0);
        INSERT INTO activities(program_id, session_id, id, exercise_id, position) VALUES ('p', 's', 'a', 'old', 0);`);
      expect(isExerciseUsed(db, "old")).toBe(true);
      setExerciseDeleted(db, "old", true);
      createExercise(db, "replacement", exercise);
      expect(() => setExerciseDeleted(db, "old", false)).toThrow(
        "name already exists",
      );
      expect(
        db.raw.prepare("SELECT exercise_id FROM activities").get(),
      ).toEqual({
        exercise_id: "old",
      });
    } finally {
      db.raw.close();
    }
  });

  it("rejects stale edits and makes notes-only changes without rewriting muscles", () => {
    const db = setup();
    try {
      createExercise(db, "e", exercise);
      expect(setExerciseNotes(db, "e", "Changed")).toBe(true);
      expect(setExerciseNotes(db, "e", "Changed")).toBe(false);
      expect(() => editExercise(db, "e", 0, exercise)).toThrow(
        "exercise changed",
      );
      expect(getSavedExercise(db, "e")?.primaryMuscles).toEqual([
        "Chest",
        "Triceps",
      ]);
      editExercise(db, "e", 1, {
        ...exercise,
        primaryMuscles: ["Shoulders"],
      });
      expect(getSavedExercise(db, "e")?.primaryMuscles).toEqual(["Shoulders"]);
    } finally {
      db.raw.close();
    }
  });

  it("updates and clears only one-rep max while detecting no-ops and stale edits", () => {
    const db = setup();
    try {
      const tx = db;
      createExercise(tx, "e", exercise);
      expect(setExerciseOneRepMax(tx, "e", { value: 100, unit: "kg" })).toBe(
        false,
      );
      expect(setExerciseOneRepMax(tx, "e", { value: 225, unit: "lbs" })).toBe(
        true,
      );
      expect(getSavedExercise(tx, "e")).toMatchObject({
        oneRepMax: { value: 225, unit: "lbs" },
        revision: 1,
        notes: "Notes",
        primaryMuscles: ["Chest", "Triceps"],
      });
      expect(() =>
        setExerciseOneRepMax(tx, "e", null, { value: 100, unit: "kg" }),
      ).toThrow("one-rep max changed");
      expect(() => editExercise(tx, "e", 0, exercise)).toThrow(
        "exercise changed",
      );
      expect(() =>
        setExerciseOneRepMax(tx, "e", { value: NaN, unit: "lbs" }),
      ).toThrow("finite");
      expect(() => setExerciseOneRepMax(tx, "missing", null)).toThrow(
        "Exercise not found",
      );
      expect(setExerciseOneRepMax(tx, "e", null)).toBe(true);
      expect(setExerciseOneRepMax(tx, "e", null)).toBe(false);
      expect(getSavedExercise(tx, "e")).toMatchObject({
        oneRepMax: null,
        revision: 2,
      });
    } finally {
      db.raw.close();
    }
  });
});
