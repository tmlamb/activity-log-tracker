import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { getEquipment, replaceEquipment } from "./equipment";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(sql: string) =>
      Promise.resolve((db.prepare(sql).get() as T | undefined) ?? null),
    getAllAsync: <T>(sql: string) =>
      Promise.resolve(db.prepare(sql).all() as T[]),
    runAsync: (sql: string, ...parameters: (string | number)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

describe("equipment inventory", () => {
  it("reorders existing equipment without breaking references and clears removed barbells", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
        INSERT INTO barbells VALUES ('a', 0, 25, 'lbs'), ('b', 1, 45, 'lbs');
        INSERT INTO exercises(id, name, normalized_name, position, barbell_id) VALUES ('e', 'Exercise', 'exercise', 0, 'a');
        BEGIN IMMEDIATE`);
      await replaceEquipment(adapter(db), {
        barbells: [
          { barbellId: "b", value: 45, unit: "lbs" },
          { barbellId: "a", value: 30, unit: "lbs" },
        ],
        plates: [{ plateId: "1", value: 2.5, unit: "kg", quantity: 3 }],
      });
      expect(
        (await getEquipment(adapter(db))).barbells.map(
          ({ barbellId }) => barbellId,
        ),
      ).toEqual(["b", "a"]);
      expect(db.prepare("SELECT barbell_id FROM exercises").get()).toEqual({
        barbell_id: "a",
      });
      await replaceEquipment(adapter(db), {
        barbells: [{ barbellId: "b", value: 45, unit: "lbs" }],
        plates: [],
      });
      db.exec("COMMIT");
      expect(
        db.prepare("SELECT barbell_id, revision FROM exercises").get(),
      ).toEqual({ barbell_id: null, revision: 1 });
    } finally {
      db.close();
    }
  });

  it("rolls back all inventory changes on a duplicate ID", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(
        `PRAGMA foreign_keys = ON; ${SCHEMA_V1} INSERT INTO barbells VALUES ('old', 0, 45, 'lbs'); BEGIN IMMEDIATE`,
      );
      const equipment = {
        barbells: [
          { barbellId: "duplicate", value: 10, unit: "lbs" as const },
          { barbellId: "duplicate", value: 20, unit: "lbs" as const },
        ],
        plates: [],
      };
      await expect(replaceEquipment(adapter(db), equipment)).rejects.toThrow();
      db.exec("ROLLBACK");
      expect((await getEquipment(adapter(db))).barbells).toEqual([
        { barbellId: "old", value: 45, unit: "lbs" },
      ]);
    } finally {
      db.close();
    }
  });
});
