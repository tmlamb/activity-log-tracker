import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { createTransactionQueue } from "../database/transactions";
import { getSavedExercise } from "./exercises";
import { materializeExercisePreset } from "./materialize-preset";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO barbells VALUES ('light',0,25,'lbs'), ('heavy',1,45,'lbs');
    INSERT INTO muscle_labels VALUES (1,'Chest','chest'), (2,'Back','back');
    INSERT INTO muscle_catalog VALUES (0,1);
    INSERT INTO exercise_presets VALUES ('preset','Bench Press',0,'BARBELL');
    INSERT INTO preset_muscles VALUES ('preset',0,1), ('preset',1,2);`);
  const transaction = {
    execAsync: (sql: string) => {
      db.exec(sql);
      return Promise.resolve();
    },
    getFirstAsync: <T>(sql: string, ...params: (string | number | null)[]) =>
      Promise.resolve(
        (db.prepare(sql).get(...params) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...params: (string | number | null)[]) =>
      Promise.resolve(db.prepare(sql).all(...params) as T[]),
    runAsync: (sql: string, ...params: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...params).changes),
      }),
  };
  return { db, queue: createTransactionQueue(transaction, "BEGIN IMMEDIATE") };
}

describe("exercise preset materialization", () => {
  it("creates once with available muscles and heaviest barbell, then reuses the saved exercise", async () => {
    const { db, queue } = setup();
    try {
      expect(
        await queue((tx) => materializeExercisePreset(tx, "preset", "e")),
      ).toEqual({ id: "e", created: true });
      expect(await queue((tx) => getSavedExercise(tx, "e"))).toMatchObject({
        name: "Bench Press",
        barbellId: "heavy",
        primaryMuscles: ["Chest"],
        revision: 0,
      });
      expect(
        await queue((tx) => materializeExercisePreset(tx, "preset", "other")),
      ).toEqual({ id: "e", created: false });
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM exercises").get(),
      ).toEqual({ count: 1 });
    } finally {
      db.close();
    }
  });

  it("does not recreate a deleted exercise or retain a partial record on failure", async () => {
    const { db, queue } = setup();
    try {
      db.exec(
        "INSERT INTO exercises(id,name,normalized_name,position,deleted) VALUES ('deleted','Bench Press','benchpress',0,1)",
      );
      await expect(
        queue((tx) => materializeExercisePreset(tx, "preset", "new")),
      ).rejects.toThrow("deleted");
      await expect(
        queue((tx) => materializeExercisePreset(tx, "missing", "new")),
      ).rejects.toThrow("no longer exists");
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM exercises").get(),
      ).toEqual({ count: 1 });
    } finally {
      db.close();
    }
  });
});
