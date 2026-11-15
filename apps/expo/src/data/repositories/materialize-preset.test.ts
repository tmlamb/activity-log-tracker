import { describe, expect, it } from "vitest";

import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import { getSavedExercise } from "./exercises";
import { materializeExercisePreset } from "./materialize-preset";

function setup() {
  return createTestDb(`
    INSERT INTO barbells VALUES ('light',0,25,'lbs'), ('heavy',1,45,'lbs');
    INSERT INTO muscle_labels VALUES (1,'Chest','chest'), (2,'Back','back');
    INSERT INTO muscle_catalog VALUES (0,1);
    INSERT INTO exercise_presets VALUES ('preset','Bench Press',0,'BARBELL');
    INSERT INTO preset_muscles VALUES ('preset',0,1), ('preset',1,2);`);
}

describe("exercise preset materialization", () => {
  it("creates once with available muscles and heaviest barbell, then reuses the saved exercise", () => {
    const db = setup();
    try {
      expect(
        transaction(db, () => materializeExercisePreset(db, "preset", "e")),
      ).toEqual({ id: "e", created: true });
      expect(getSavedExercise(db, "e")).toMatchObject({
        name: "Bench Press",
        barbellId: "heavy",
        primaryMuscles: ["Chest"],
        revision: 0,
      });
      expect(
        transaction(db, () => materializeExercisePreset(db, "preset", "other")),
      ).toEqual({ id: "e", created: false });
      expect(
        db.raw.prepare("SELECT COUNT(*) AS count FROM exercises").get(),
      ).toEqual({ count: 1 });
    } finally {
      db.raw.close();
    }
  });

  it("does not recreate a deleted exercise or retain a partial record on failure", () => {
    const db = setup();
    try {
      db.raw.exec(
        "INSERT INTO exercises(id,name,normalized_name,position,deleted) VALUES ('deleted','Bench Press','benchpress',0,1)",
      );
      expect(() =>
        transaction(db, () => materializeExercisePreset(db, "preset", "new")),
      ).toThrow("deleted");
      expect(() =>
        transaction(db, () => materializeExercisePreset(db, "missing", "new")),
      ).toThrow("no longer exists");
      expect(
        db.raw.prepare("SELECT COUNT(*) AS count FROM exercises").get(),
      ).toEqual({ count: 1 });
    } finally {
      db.raw.close();
    }
  });
});
