import { normalizeMuscleGroups } from "@activity-log/ui/utils";

import type { Db } from "../database/db";

export interface ExercisePreset {
  id: string;
  name: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  primaryMuscles: string[];
}

export function listExercisePresets(transaction: Db): ExercisePreset[] {
  const rows = transaction.getAllSync<Omit<ExercisePreset, "primaryMuscles">>(
    "SELECT id, name, load_kind AS loadKind FROM exercise_presets ORDER BY position",
  );
  const memberships = transaction.getAllSync<{
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

export function listMuscleCatalog(transaction: Db): string[] {
  const rows = transaction.getAllSync<{ name: string }>(
    `SELECT l.name FROM muscle_catalog c JOIN muscle_labels l ON l.id = c.muscle_id ORDER BY c.position`,
  );
  return rows.map(({ name }) => name);
}

/** Replace the catalog and prune saved exercise assignments in one transaction. */
export function replaceMuscleCatalog(
  transaction: Db,
  input: string[],
): string[] {
  const labels = normalizeMuscleGroups(input).sort((a, b) =>
    a.localeCompare(b),
  );
  transaction.runSync("DELETE FROM muscle_catalog");
  for (const [position, label] of labels.entries()) {
    transaction.runSync(
      "INSERT INTO muscle_labels(name, normalized_name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING",
      label,
      label.toLocaleLowerCase(),
    );
    const row = transaction.getFirstSync<{ id: number }>(
      "SELECT id FROM muscle_labels WHERE name = ?",
      label,
    );
    if (!row) throw new Error("Muscle label could not be saved.");
    transaction.runSync(
      "INSERT INTO muscle_catalog(position, muscle_id) VALUES (?, ?)",
      position,
      row.id,
    );
  }
  const changed = transaction.getAllSync<{ id: string }>(
    `SELECT DISTINCT exercise_id AS id FROM exercise_muscles
     WHERE muscle_id NOT IN (SELECT muscle_id FROM muscle_catalog)`,
  );
  transaction.runSync(
    `UPDATE exercises SET revision = revision + 1 WHERE id IN (
       SELECT exercise_id FROM exercise_muscles WHERE muscle_id NOT IN (SELECT muscle_id FROM muscle_catalog)
     )`,
  );
  transaction.runSync(
    "DELETE FROM exercise_muscles WHERE muscle_id NOT IN (SELECT muscle_id FROM muscle_catalog)",
  );
  return changed.map(({ id }) => id);
}
