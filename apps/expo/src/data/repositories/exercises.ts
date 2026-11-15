import {
  normalizeExerciseName,
  normalizeMuscleGroups,
  normalizeSingleLineText,
} from "@activity-log/ui/utils";

import type { Db } from "../database/db";

export interface ExerciseInput {
  name: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  barbellId: string | null;
  oneRepMax: { value: number; unit: "lbs" | "kg" } | null;
  primaryMuscles: string[];
  notes: string | null;
}

export interface SavedExercise extends ExerciseInput {
  id: string;
  deleted: boolean;
  revision: number;
}

interface ExerciseRow {
  id: string;
  name: string;
  loadKind: ExerciseInput["loadKind"];
  barbellId: string | null;
  oneRepMaxValue: number | null;
  oneRepMaxUnit: "lbs" | "kg" | null;
  notes: string | null;
  deleted: number;
  revision: number;
}

const EXERCISE_COLUMNS = `id, name, load_kind AS loadKind, barbell_id AS barbellId,
  one_rep_max_value AS oneRepMaxValue, one_rep_max_unit AS oneRepMaxUnit,
  notes, deleted, revision`;

function materialize(
  row: ExerciseRow,
  primaryMuscles: string[],
): SavedExercise {
  return {
    id: row.id,
    name: row.name,
    loadKind: row.loadKind,
    barbellId: row.barbellId,
    oneRepMax:
      row.oneRepMaxValue !== null && row.oneRepMaxUnit !== null
        ? { value: row.oneRepMaxValue, unit: row.oneRepMaxUnit }
        : null,
    notes: row.notes,
    deleted: row.deleted === 1,
    revision: row.revision,
    primaryMuscles,
  };
}

/** List the saved catalog with two bounded queries, including soft-deleted rows. */
export function listSavedExercises(transaction: Db): SavedExercise[] {
  const rows = transaction.getAllSync<ExerciseRow>(
    `SELECT ${EXERCISE_COLUMNS} FROM exercises ORDER BY position`,
  );
  const memberships = transaction.getAllSync<{
    exerciseId: string;
    name: string;
  }>(
    `SELECT m.exercise_id AS exerciseId, l.name FROM exercise_muscles m
     JOIN muscle_labels l ON l.id = m.muscle_id ORDER BY m.exercise_id, m.position`,
  );
  const byExercise = new Map<string, string[]>();
  for (const membership of memberships) {
    const group = byExercise.get(membership.exerciseId) ?? [];
    group.push(membership.name);
    byExercise.set(membership.exerciseId, group);
  }
  return rows.map((row) => materialize(row, byExercise.get(row.id) ?? []));
}

export function getSavedExercise(
  transaction: Db,
  exerciseId: string,
): SavedExercise | null {
  const row = transaction.getFirstSync<ExerciseRow>(
    `SELECT ${EXERCISE_COLUMNS} FROM exercises WHERE id = ?`,
    exerciseId,
  );
  if (!row) return null;
  const memberships = transaction.getAllSync<{ name: string }>(
    `SELECT l.name FROM exercise_muscles m JOIN muscle_labels l ON l.id = m.muscle_id
     WHERE m.exercise_id = ? ORDER BY m.position`,
    exerciseId,
  );
  return materialize(
    row,
    memberships.map(({ name }) => name),
  );
}

export function isExerciseUsed(transaction: Db, exerciseId: string): boolean {
  const row = transaction.getFirstSync<{ found: number }>(
    "SELECT EXISTS(SELECT 1 FROM activities WHERE exercise_id = ?) AS found",
    exerciseId,
  );
  return row?.found === 1;
}

function replaceMuscles(transaction: Db, exerciseId: string, labels: string[]) {
  transaction.runSync(
    "DELETE FROM exercise_muscles WHERE exercise_id = ?",
    exerciseId,
  );
  for (const [position, label] of normalizeMuscleGroups(labels).entries()) {
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
      "INSERT INTO exercise_muscles(exercise_id, position, muscle_id) VALUES (?, ?, ?)",
      exerciseId,
      position,
      row.id,
    );
  }
}

function ensureAvailableName(
  transaction: Db,
  normalizedName: string,
  exceptId: string,
) {
  const duplicate = transaction.getFirstSync<{ id: string }>(
    "SELECT id FROM exercises WHERE normalized_name = ? AND deleted = 0 AND id <> ? LIMIT 1",
    normalizedName,
    exceptId,
  );
  if (duplicate) throw new Error("Exercise name already exists");
}

function validateExercise(input: ExerciseInput) {
  if (input.oneRepMax !== null && !Number.isFinite(input.oneRepMax.value))
    throw new Error("One-rep max must be a finite number.");
}

/** Exercise writes and membership changes require one writer transaction. */
export function createExercise(
  transaction: Db,
  id: string,
  input: ExerciseInput,
) {
  validateExercise(input);
  const name = normalizeSingleLineText(input.name);
  const key = normalizeExerciseName(name);
  ensureAvailableName(transaction, key, id);
  transaction.runSync(
    `INSERT INTO exercises(id, name, normalized_name, position, load_kind, barbell_id, one_rep_max_value, one_rep_max_unit, notes)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM exercises), ?, ?, ?, ?, ?)`,
    id,
    name,
    key,
    input.loadKind,
    input.barbellId,
    input.oneRepMax?.value ?? null,
    input.oneRepMax?.unit ?? null,
    input.notes,
  );
  replaceMuscles(transaction, id, input.primaryMuscles);
}

export function editExercise(
  transaction: Db,
  id: string,
  baseRevision: number,
  input: ExerciseInput,
) {
  validateExercise(input);
  const current = transaction.getFirstSync<{
    revision: number;
    deleted: number;
  }>("SELECT revision, deleted FROM exercises WHERE id = ?", id);
  if (!current) throw new Error("Exercise not found");
  if (current.revision !== baseRevision)
    throw new Error("The exercise changed. Reload before saving.");
  const name = normalizeSingleLineText(input.name);
  const key = normalizeExerciseName(name);
  if (!current.deleted) ensureAvailableName(transaction, key, id);
  transaction.runSync(
    `UPDATE exercises SET name = ?, normalized_name = ?, load_kind = ?, barbell_id = ?,
       one_rep_max_value = ?, one_rep_max_unit = ?, notes = ?, revision = revision + 1 WHERE id = ?`,
    name,
    key,
    input.loadKind,
    input.barbellId,
    input.oneRepMax?.value ?? null,
    input.oneRepMax?.unit ?? null,
    input.notes,
    id,
  );
  replaceMuscles(transaction, id, input.primaryMuscles);
}

export function setExerciseDeleted(
  transaction: Db,
  id: string,
  deleted: boolean,
  expectedRevision?: number,
) {
  const current = transaction.getFirstSync<{
    normalizedName: string;
    deleted: number;
    revision: number;
  }>(
    "SELECT normalized_name AS normalizedName, deleted, revision FROM exercises WHERE id = ?",
    id,
  );
  if (!current) throw new Error("Exercise not found");
  if (expectedRevision !== undefined && current.revision !== expectedRevision)
    throw new Error("The exercise changed. Reload before saving.");
  if ((current.deleted === 1) === deleted) return false;
  if (!deleted) ensureAvailableName(transaction, current.normalizedName, id);
  transaction.runSync(
    "UPDATE exercises SET deleted = ?, revision = revision + 1 WHERE id = ?",
    Number(deleted),
    id,
  );
  return true;
}

export function setExerciseNotes(
  transaction: Db,
  id: string,
  notes: string | null,
) {
  const current = transaction.getFirstSync<{ notes: string | null }>(
    "SELECT notes FROM exercises WHERE id = ?",
    id,
  );
  if (!current) throw new Error("Exercise not found");
  if (current.notes === notes) return false;
  transaction.runSync(
    "UPDATE exercises SET notes = ?, revision = revision + 1 WHERE id = ?",
    notes,
    id,
  );
  return true;
}

/** Change only the live 1RM reference, without overwriting a stale editor draft. */
export function setExerciseOneRepMax(
  transaction: Db,
  id: string,
  weight: ExerciseInput["oneRepMax"],
  expected?: ExerciseInput["oneRepMax"],
) {
  if (weight !== null && !Number.isFinite(weight.value))
    throw new Error("One-rep max must be a finite number.");
  const current = transaction.getFirstSync<{
    value: number | null;
    unit: "lbs" | "kg" | null;
  }>(
    "SELECT one_rep_max_value AS value, one_rep_max_unit AS unit FROM exercises WHERE id = ?",
    id,
  );
  if (!current) throw new Error("Exercise not found");
  if (
    expected !== undefined &&
    (current.value !== (expected?.value ?? null) ||
      current.unit !== (expected?.unit ?? null))
  )
    throw new Error(
      "The one-rep max changed. Reopen this screen before saving.",
    );
  if (
    current.value === (weight?.value ?? null) &&
    current.unit === (weight?.unit ?? null)
  )
    return false;
  transaction.runSync(
    "UPDATE exercises SET one_rep_max_value = ?, one_rep_max_unit = ?, revision = revision + 1 WHERE id = ?",
    weight?.value ?? null,
    weight?.unit ?? null,
    id,
  );
  return true;
}
