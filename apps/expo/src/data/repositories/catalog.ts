import { normalizeMuscleGroups } from "@activity-log/ui/utils";

interface CatalogTransaction {
  getFirstAsync<T>(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<T | null>;
  getAllAsync<T>(sql: string, ...parameters: (string | number)[]): Promise<T[]>;
  runAsync(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<{ changes: number }>;
}

export interface ExercisePreset {
  id: string;
  name: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  primaryMuscles: string[];
}

export async function listExercisePresets(
  transaction: CatalogTransaction,
): Promise<ExercisePreset[]> {
  const rows = await transaction.getAllAsync<
    Omit<ExercisePreset, "primaryMuscles">
  >(
    "SELECT id, name, load_kind AS loadKind FROM exercise_presets ORDER BY position",
  );
  const memberships = await transaction.getAllAsync<{
    presetId: string;
    name: string;
  }>(
    `SELECT m.preset_id AS presetId, l.name FROM preset_muscles m
     JOIN muscle_labels l ON l.id = m.muscle_id ORDER BY m.preset_id, m.position`,
  );
  const byPreset = new Map<string, string[]>();
  for (const membership of memberships) {
    const labels = byPreset.get(membership.presetId) ?? [];
    labels.push(membership.name);
    byPreset.set(membership.presetId, labels);
  }
  return rows.map((row) => ({
    ...row,
    primaryMuscles: byPreset.get(row.id) ?? [],
  }));
}

export async function listMuscleCatalog(
  transaction: CatalogTransaction,
): Promise<string[]> {
  const rows = await transaction.getAllAsync<{ name: string }>(
    `SELECT l.name FROM muscle_catalog c JOIN muscle_labels l ON l.id = c.muscle_id ORDER BY c.position`,
  );
  return rows.map(({ name }) => name);
}

/** Replace the catalog and prune saved exercise assignments in one transaction. */
export async function replaceMuscleCatalog(
  transaction: CatalogTransaction,
  input: string[],
): Promise<string[]> {
  const labels = normalizeMuscleGroups(input).sort((a, b) =>
    a.localeCompare(b),
  );
  await transaction.runAsync("DELETE FROM muscle_catalog");
  for (const [position, label] of labels.entries()) {
    await transaction.runAsync(
      "INSERT INTO muscle_labels(name, normalized_name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING",
      label,
      label.toLocaleLowerCase(),
    );
    const row = await transaction.getFirstAsync<{ id: number }>(
      "SELECT id FROM muscle_labels WHERE name = ?",
      label,
    );
    if (!row) throw new Error("Muscle label could not be saved.");
    await transaction.runAsync(
      "INSERT INTO muscle_catalog(position, muscle_id) VALUES (?, ?)",
      position,
      row.id,
    );
  }
  const changed = await transaction.getAllAsync<{ id: string }>(
    `SELECT DISTINCT exercise_id AS id FROM exercise_muscles
     WHERE muscle_id NOT IN (SELECT muscle_id FROM muscle_catalog)`,
  );
  await transaction.runAsync(
    `UPDATE exercises SET revision = revision + 1 WHERE id IN (
       SELECT exercise_id FROM exercise_muscles WHERE muscle_id NOT IN (SELECT muscle_id FROM muscle_catalog)
     )`,
  );
  await transaction.runAsync(
    "DELETE FROM exercise_muscles WHERE muscle_id NOT IN (SELECT muscle_id FROM muscle_catalog)",
  );
  return changed.map(({ id }) => id);
}
