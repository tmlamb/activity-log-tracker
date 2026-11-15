import { describe, expect, it } from "vitest";

import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import { getEquipment, replaceEquipment } from "./equipment";

describe("equipment inventory", () => {
  it("reorders existing equipment without breaking references and clears removed barbells", () => {
    const db = createTestDb(`
      INSERT INTO barbells VALUES ('a', 0, 25, 'lbs'), ('b', 1, 45, 'lbs');
      INSERT INTO exercises(id, name, normalized_name, position, barbell_id) VALUES ('e', 'Exercise', 'exercise', 0, 'a');`);
    try {
      replaceEquipment(db, {
        barbells: [
          { barbellId: "b", value: 45, unit: "lbs" },
          { barbellId: "a", value: 30, unit: "lbs" },
        ],
        plates: [{ plateId: "1", value: 2.5, unit: "kg", quantity: 3 }],
      });
      expect(
        getEquipment(db).barbells.map(({ barbellId }) => barbellId),
      ).toEqual(["b", "a"]);
      expect(db.raw.prepare("SELECT barbell_id FROM exercises").get()).toEqual({
        barbell_id: "a",
      });
      replaceEquipment(db, {
        barbells: [{ barbellId: "b", value: 45, unit: "lbs" }],
        plates: [],
      });
      expect(
        db.raw.prepare("SELECT barbell_id, revision FROM exercises").get(),
      ).toEqual({ barbell_id: null, revision: 1 });
    } finally {
      db.raw.close();
    }
  });

  it("rolls back all inventory changes on a duplicate ID", () => {
    const db = createTestDb(
      "INSERT INTO barbells VALUES ('old', 0, 45, 'lbs');",
    );
    try {
      const equipment = {
        barbells: [
          { barbellId: "duplicate", value: 10, unit: "lbs" as const },
          { barbellId: "duplicate", value: 20, unit: "lbs" as const },
        ],
        plates: [],
      };
      expect(() =>
        transaction(db, () => replaceEquipment(db, equipment)),
      ).toThrow();
      expect(getEquipment(db).barbells).toEqual([
        { barbellId: "old", value: 45, unit: "lbs" },
      ]);
    } finally {
      db.raw.close();
    }
  });
});
