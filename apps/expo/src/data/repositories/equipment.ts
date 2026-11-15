import type { Equipment } from "@activity-log/ui/utils";

import type { Db } from "../database/db";

export function getEquipment(db: Db): Equipment {
  return {
    barbells: db.getAllSync<Equipment["barbells"][number]>(
      "SELECT id AS barbellId, value, unit FROM barbells ORDER BY position",
    ),
    plates: db.getAllSync<Equipment["plates"][number]>(
      "SELECT id AS plateId, value, unit, quantity FROM plates ORDER BY position",
    ),
  };
}

/** Preserve referenced IDs while atomically replacing and reordering inventory. */
export function replaceEquipment(transaction: Db, equipment: Equipment) {
  const barbellIds = new Set<string>();
  for (const barbell of equipment.barbells) {
    if (!barbell.barbellId.trim() || barbellIds.has(barbell.barbellId))
      throw new Error("Invalid or duplicate barbell ID.");
    barbellIds.add(barbell.barbellId);
    if (!Number.isFinite(barbell.value))
      throw new Error("Equipment weights must be finite numbers.");
  }
  const plateIds = new Set<string>();
  for (const plate of equipment.plates) {
    if (!plate.plateId.trim() || plateIds.has(plate.plateId))
      throw new Error("Invalid or duplicate plate ID.");
    plateIds.add(plate.plateId);
    if (!Number.isFinite(plate.value) || !Number.isFinite(plate.quantity))
      throw new Error("Equipment values must be finite numbers.");
  }
  const barbellMax = transaction.getFirstSync<{ max: number }>(
    "SELECT COALESCE(MAX(position), -1) AS max FROM barbells",
  );
  const barbellOffset = (barbellMax?.max ?? -1) + equipment.barbells.length + 2;
  transaction.runSync(
    "UPDATE barbells SET position = position + ?",
    barbellOffset,
  );
  for (const [position, barbell] of equipment.barbells.entries()) {
    transaction.runSync(
      `INSERT INTO barbells(id, position, value, unit) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET position = excluded.position, value = excluded.value, unit = excluded.unit`,
      barbell.barbellId,
      position,
      barbell.value,
      barbell.unit,
    );
  }
  transaction.runSync(
    `UPDATE exercises SET barbell_id = NULL, revision = revision + 1
     WHERE barbell_id IN (SELECT id FROM barbells WHERE position >= ?)`,
    barbellOffset,
  );
  transaction.runSync(
    "DELETE FROM barbells WHERE position >= ?",
    barbellOffset,
  );

  const plateMax = transaction.getFirstSync<{ max: number }>(
    "SELECT COALESCE(MAX(position), -1) AS max FROM plates",
  );
  const plateOffset = (plateMax?.max ?? -1) + equipment.plates.length + 2;
  transaction.runSync("UPDATE plates SET position = position + ?", plateOffset);
  for (const [position, plate] of equipment.plates.entries()) {
    transaction.runSync(
      `INSERT INTO plates(id, position, value, unit, quantity) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET position = excluded.position, value = excluded.value, unit = excluded.unit, quantity = excluded.quantity`,
      plate.plateId,
      position,
      plate.value,
      plate.unit,
      plate.quantity,
    );
  }
  transaction.runSync("DELETE FROM plates WHERE position >= ?", plateOffset);
}
