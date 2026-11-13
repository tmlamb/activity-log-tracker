import type { Equipment } from "@activity-log/ui/utils";

interface EquipmentTransaction {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<{ changes: number }>;
}

export async function getEquipment(
  transaction: EquipmentTransaction,
): Promise<Equipment> {
  const barbells = await transaction.getAllAsync<Equipment["barbells"][number]>(
    "SELECT id AS barbellId, value, unit FROM barbells ORDER BY position",
  );
  const plates = await transaction.getAllAsync<Equipment["plates"][number]>(
    "SELECT id AS plateId, value, unit, quantity FROM plates ORDER BY position",
  );
  return { barbells, plates };
}

/** Preserve referenced IDs while atomically replacing and reordering inventory. */
export async function replaceEquipment(
  transaction: EquipmentTransaction,
  equipment: Equipment,
) {
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
  const barbellMax = await transaction.getFirstAsync<{ max: number }>(
    "SELECT COALESCE(MAX(position), -1) AS max FROM barbells",
  );
  const barbellOffset = (barbellMax?.max ?? -1) + equipment.barbells.length + 2;
  await transaction.runAsync(
    "UPDATE barbells SET position = position + ?",
    barbellOffset,
  );
  for (const [position, barbell] of equipment.barbells.entries()) {
    await transaction.runAsync(
      `INSERT INTO barbells(id, position, value, unit) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET position = excluded.position, value = excluded.value, unit = excluded.unit`,
      barbell.barbellId,
      position,
      barbell.value,
      barbell.unit,
    );
  }
  await transaction.runAsync(
    `UPDATE exercises SET barbell_id = NULL, revision = revision + 1
     WHERE barbell_id IN (SELECT id FROM barbells WHERE position >= ?)`,
    barbellOffset,
  );
  await transaction.runAsync(
    "DELETE FROM barbells WHERE position >= ?",
    barbellOffset,
  );

  const plateMax = await transaction.getFirstAsync<{ max: number }>(
    "SELECT COALESCE(MAX(position), -1) AS max FROM plates",
  );
  const plateOffset = (plateMax?.max ?? -1) + equipment.plates.length + 2;
  await transaction.runAsync(
    "UPDATE plates SET position = position + ?",
    plateOffset,
  );
  for (const [position, plate] of equipment.plates.entries()) {
    await transaction.runAsync(
      `INSERT INTO plates(id, position, value, unit, quantity) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET position = excluded.position, value = excluded.value, unit = excluded.unit, quantity = excluded.quantity`,
      plate.plateId,
      position,
      plate.value,
      plate.unit,
      plate.quantity,
    );
  }
  await transaction.runAsync(
    "DELETE FROM plates WHERE position >= ?",
    plateOffset,
  );
}
