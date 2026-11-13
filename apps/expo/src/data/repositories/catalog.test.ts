import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import {
  listExercisePresets,
  listMuscleCatalog,
  replaceMuscleCatalog,
} from "./catalog";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(sql: string, ...parameters: (string | number)[]) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...parameters: (string | number)[]) =>
      Promise.resolve(db.prepare(sql).all(...parameters) as T[]),
    runAsync: (sql: string, ...parameters: (string | number)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

describe("exercise catalog", () => {
  it("updates the muscle catalog and prunes exact saved-exercise labels without changing presets", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
        INSERT INTO exercises(id, name, normalized_name, position) VALUES ('e', 'Exercise', 'exercise', 0);
        INSERT INTO exercise_presets(id, name, position, load_kind) VALUES ('preset', 'Preset', 0, 'BARBELL');
        INSERT INTO muscle_labels VALUES (1, 'Quads', 'quads'), (2, 'quads', 'quads');
        INSERT INTO muscle_catalog VALUES (0, 1);
        INSERT INTO exercise_muscles VALUES ('e', 0, 1), ('e', 1, 2);
        INSERT INTO preset_muscles VALUES ('preset', 0, 2), ('preset', 1, 2);
        BEGIN IMMEDIATE;`);
      expect(
        await replaceMuscleCatalog(adapter(db), [" Quads ", "QUADS"]),
      ).toEqual(["e"]);
      expect(await listMuscleCatalog(adapter(db))).toEqual(["Quads"]);
      expect(
        db.prepare("SELECT muscle_id FROM exercise_muscles").all(),
      ).toEqual([{ muscle_id: 1 }]);
      expect(db.prepare("SELECT revision FROM exercises").get()).toEqual({
        revision: 1,
      });
      expect(await listExercisePresets(adapter(db))).toEqual([
        {
          id: "preset",
          name: "Preset",
          loadKind: "BARBELL",
          primaryMuscles: ["quads", "quads"],
        },
      ]);
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  });
});
