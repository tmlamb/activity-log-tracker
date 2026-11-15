import { describe, expect, it } from "vitest";

import { createTestDb } from "../database/test-db";
import {
  listExercisePresets,
  listMuscleCatalog,
  replaceMuscleCatalog,
} from "./catalog";

describe("exercise catalog", () => {
  it("updates the muscle catalog and prunes exact saved-exercise labels without changing presets", () => {
    const db = createTestDb(`
        INSERT INTO exercises(id, name, normalized_name, position) VALUES ('e', 'Exercise', 'exercise', 0);
        INSERT INTO exercise_presets(id, name, position, load_kind) VALUES ('preset', 'Preset', 0, 'BARBELL');
        INSERT INTO muscle_labels VALUES (1, 'Quads', 'quads'), (2, 'quads', 'quads');
        INSERT INTO muscle_catalog VALUES (0, 1);
        INSERT INTO exercise_muscles VALUES ('e', 0, 1), ('e', 1, 2);
        INSERT INTO preset_muscles VALUES ('preset', 0, 2), ('preset', 1, 2);`);
    try {
      expect(replaceMuscleCatalog(db, [" Quads ", "QUADS"])).toEqual(["e"]);
      expect(listMuscleCatalog(db)).toEqual(["Quads"]);
      expect(
        db.raw.prepare("SELECT muscle_id FROM exercise_muscles").all(),
      ).toEqual([{ muscle_id: 1 }]);
      expect(db.raw.prepare("SELECT revision FROM exercises").get()).toEqual({
        revision: 1,
      });
      expect(listExercisePresets(db)).toEqual([
        {
          id: "preset",
          name: "Preset",
          loadKind: "BARBELL",
          primaryMuscles: ["quads", "quads"],
        },
      ]);
    } finally {
      db.raw.close();
    }
  });
});
