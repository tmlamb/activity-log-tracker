import {
  normalizeExerciseName,
  normalizeMuscleGroups,
  normalizeSingleLineText,
} from "@activity-log/ui/utils";

type Parameter = string | number | null;
interface ExerciseTransaction {
  getFirstAsync<T>(sql: string, ...parameters: Parameter[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...parameters: Parameter[]): Promise<T[]>;
  runAsync(
    sql: string,
    ...parameters: Parameter[]
  ): Promise<{ changes: number }>;
}

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
export async function listSavedExercises(
  transaction: ExerciseTransaction,
): Promise<SavedExercise[]> {
  const rows = await transaction.getAllAsync<ExerciseRow>(
    `SELECT ${EXERCISE_COLUMNS} FROM exercises ORDER BY position`,
  );
  const memberships = await transaction.getAllAsync<{
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

export async function getSavedExercise(
  transaction: ExerciseTransaction,
  exerciseId: string,
): Promise<SavedExercise | null> {
  const row = await transaction.getFirstAsync<ExerciseRow>(
    `SELECT ${EXERCISE_COLUMNS} FROM exercises WHERE id = ?`,
    exerciseId,
  );
  if (!row) return null;
  const memberships = await transaction.getAllAsync<{ name: string }>(
    `SELECT l.name FROM exercise_muscles m JOIN muscle_labels l ON l.id = m.muscle_id
     WHERE m.exercise_id = ? ORDER BY m.position`,
    exerciseId,
  );
  return materialize(
    row,
    memberships.map(({ name }) => name),
  );
}

export async function isExerciseUsed(
  transaction: ExerciseTransaction,
  exerciseId: string,
): Promise<boolean> {
  const row = await transaction.getFirstAsync<{ found: number }>(
    "SELECT EXISTS(SELECT 1 FROM activities WHERE exercise_id = ?) AS found",
    exerciseId,
  );
  return row?.found === 1;
}

async function replaceMuscles(
  transaction: ExerciseTransaction,
  exerciseId: string,
  labels: string[],
) {
  await transaction.runAsync(
    "DELETE FROM exercise_muscles WHERE exercise_id = ?",
    exerciseId,
  );
  for (const [position, label] of normalizeMuscleGroups(labels).entries()) {
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
      "INSERT INTO exercise_muscles(exercise_id, position, muscle_id) VALUES (?, ?, ?)",
      exerciseId,
      position,
      row.id,
    );
  }
}

async function ensureAvailableName(
  transaction: ExerciseTransaction,
  normalizedName: string,
  exceptId: string,
) {
  const duplicate = await transaction.getFirstAsync<{ id: string }>(
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
export async function createExercise(
  transaction: ExerciseTransaction,
  id: string,
  input: ExerciseInput,
) {
  validateExercise(input);
  const name = normalizeSingleLineText(input.name);
  const key = normalizeExerciseName(name);
  await ensureAvailableName(transaction, key, id);
  await transaction.runAsync(
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
  await replaceMuscles(transaction, id, input.primaryMuscles);
}

export async function editExercise(
  transaction: ExerciseTransaction,
  id: string,
  baseRevision: number,
  input: ExerciseInput,
) {
  validateExercise(input);
  const current = await transaction.getFirstAsync<{
    revision: number;
    deleted: number;
  }>("SELECT revision, deleted FROM exercises WHERE id = ?", id);
  if (!current) throw new Error("Exercise not found");
  if (current.revision !== baseRevision)
    throw new Error("The exercise changed. Reload before saving.");
  const name = normalizeSingleLineText(input.name);
  const key = normalizeExerciseName(name);
  if (!current.deleted) await ensureAvailableName(transaction, key, id);
  await transaction.runAsync(
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
  await replaceMuscles(transaction, id, input.primaryMuscles);
}

export async function setExerciseDeleted(
  transaction: ExerciseTransaction,
  id: string,
  deleted: boolean,
) {
  const current = await transaction.getFirstAsync<{
    normalizedName: string;
    deleted: number;
  }>(
    "SELECT normalized_name AS normalizedName, deleted FROM exercises WHERE id = ?",
    id,
  );
  if (!current) throw new Error("Exercise not found");
  if ((current.deleted === 1) === deleted) return false;
  if (!deleted)
    await ensureAvailableName(transaction, current.normalizedName, id);
  await transaction.runAsync(
    "UPDATE exercises SET deleted = ?, revision = revision + 1 WHERE id = ?",
    Number(deleted),
    id,
  );
  return true;
}

export async function setExerciseNotes(
  transaction: ExerciseTransaction,
  id: string,
  notes: string | null,
) {
  const current = await transaction.getFirstAsync<{ notes: string | null }>(
    "SELECT notes FROM exercises WHERE id = ?",
    id,
  );
  if (!current) throw new Error("Exercise not found");
  if (current.notes === notes) return false;
  await transaction.runAsync(
    "UPDATE exercises SET notes = ?, revision = revision + 1 WHERE id = ?",
    notes,
    id,
  );
  return true;
}
