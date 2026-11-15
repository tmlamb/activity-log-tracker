import { normalizeExerciseName } from "@activity-log/ui/utils";

import type { Db } from "../database/db";
import { createExercise } from "./exercises";

/** Resolve or materialize a selected preset in the same writer transaction. */
export function materializeExercisePreset(
  transaction: Db,
  presetId: string,
  newId: string,
) {
  const preset = transaction.getFirstSync<{
    name: string;
    loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  }>(
    "SELECT name, load_kind AS loadKind FROM exercise_presets WHERE id = ?",
    presetId,
  );
  if (!preset)
    throw new Error("The selected exercise preset no longer exists.");
  const existing = transaction.getFirstSync<{
    id: string;
    deleted: number;
  }>(
    "SELECT id, deleted FROM exercises WHERE normalized_name = ? ORDER BY deleted, position LIMIT 1",
    normalizeExerciseName(preset.name),
  );
  if (existing) {
    if (existing.deleted === 1)
      throw new Error(
        "The selected exercise is deleted. Restore it before selecting it.",
      );
    return { id: existing.id, created: false };
  }
  const labels = transaction.getAllSync<{ name: string }>(
    `SELECT l.name FROM preset_muscles m JOIN muscle_labels l ON l.id = m.muscle_id
     WHERE m.preset_id = ? AND EXISTS (SELECT 1 FROM muscle_catalog c WHERE c.muscle_id = m.muscle_id)
     ORDER BY m.position`,
    presetId,
  );
  const barbell =
    preset.loadKind === "BARBELL"
      ? transaction.getFirstSync<{ id: string }>(
          "SELECT id FROM barbells ORDER BY value DESC, position LIMIT 1",
        )
      : null;
  createExercise(transaction, newId, {
    name: preset.name,
    loadKind: preset.loadKind,
    barbellId: barbell?.id ?? null,
    oneRepMax: null,
    primaryMuscles: labels.map(({ name }) => name),
    notes: null,
  });
  return { id: newId, created: true };
}
