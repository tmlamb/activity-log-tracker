import { prepareLegacyConversion } from "./conversion";
import { selectLegacySource } from "./source";

type Conversion = ReturnType<typeof prepareLegacyConversion>;
type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

export interface PopulationTransaction {
  getFirstAsync<T>(sql: string, ...parameters: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(
    sql: string,
    ...parameters: SqlValue[]
  ): Promise<{ changes: number }>;
  prepareAsync(sql: string): Promise<{
    executeAsync(...parameters: SqlValue[]): Promise<unknown>;
    finalizeAsync(): Promise<void>;
  }>;
}

interface TableSpec {
  table: string;
  columns: string[];
  rows: Row[];
}

// Table and column names are fixed in code; only values come from the source.
function tables(conversion: Conversion): TableSpec[] {
  const { settings, history } = conversion;
  return [
    {
      table: "barbells",
      columns: ["id", "position", "value", "unit"],
      rows: settings.barbells,
    },
    {
      table: "plates",
      columns: ["id", "position", "value", "unit", "quantity"],
      rows: settings.plates,
    },
    {
      table: "exercises",
      columns: [
        "id",
        "name",
        "normalized_name",
        "position",
        "load_kind",
        "barbell_id",
        "one_rep_max_value",
        "one_rep_max_unit",
        "notes",
        "deleted",
      ],
      rows: settings.exercises,
    },
    {
      table: "exercise_presets",
      columns: ["id", "name", "position", "load_kind"],
      rows: settings.presets,
    },
    {
      table: "muscle_labels",
      columns: ["id", "name", "normalized_name"],
      rows: settings.muscles,
    },
    {
      table: "muscle_catalog",
      columns: ["position", "muscle_id"],
      rows: settings.catalog,
    },
    {
      table: "exercise_muscles",
      columns: ["exercise_id", "position", "muscle_id"],
      rows: settings.exerciseMuscles,
    },
    {
      table: "preset_muscles",
      columns: ["preset_id", "position", "muscle_id"],
      rows: settings.presetMuscles,
    },
    {
      table: "programs",
      columns: ["id", "name", "position"],
      rows: history.programs,
    },
    {
      table: "session_lineages",
      columns: ["program_id", "id"],
      rows: history.lineages,
    },
    {
      table: "sessions",
      columns: [
        "program_id",
        "id",
        "lineage_id",
        "name",
        "position",
        "status",
        "deload",
        "start_ms",
        "end_ms",
        "last_activity_at_ms",
      ],
      rows: history.sessions,
    },
    {
      table: "activities",
      columns: [
        "program_id",
        "session_id",
        "id",
        "exercise_id",
        "position",
        "reps",
        "load_type",
        "load_value",
        "rest_minutes",
      ],
      rows: history.activities,
    },
    {
      table: "workout_sets",
      columns: [
        "program_id",
        "session_id",
        "activity_id",
        "id",
        "kind",
        "position",
        "status",
        "feedback",
        "actual_reps",
        "weight_value",
        "weight_unit",
        "start_ms",
        "end_ms",
      ],
      rows: history.sets,
    },
  ];
}

function values(row: Row, columns: string[]): SqlValue[] {
  return columns.map((column) => {
    const value = row[column];
    if (value === undefined)
      throw new Error(`Conversion omitted column ${column}.`);
    return value;
  });
}

async function conversionFromSnapshot(
  transaction: PopulationTransaction,
  snapshotId: number,
) {
  const snapshot = await transaction.getFirstAsync<{
    workout: string | null;
    exercises: string | null;
    restore_journal: string | null;
  }>(
    "SELECT workout, exercises, restore_journal FROM conversion_snapshots WHERE id = ?",
    snapshotId,
  );
  if (!snapshot) throw new Error("The conversion snapshot is missing.");
  return prepareLegacyConversion(
    selectLegacySource({
      workout: snapshot.workout,
      exercises: snapshot.exercises,
      restoreJournal: snapshot.restore_journal,
    }),
  );
}

/** Must run in the private writer transaction; no partial import may commit. */
export async function populateLegacyData(
  transaction: PopulationTransaction,
  snapshotId: number,
) {
  const state = await transaction.getFirstAsync<{ state: string }>(
    "SELECT state FROM bootstrap_state WHERE singleton = 1",
  );
  if (state?.state !== "source-captured")
    throw new Error("The database is not awaiting conversion.");
  const conversion = await conversionFromSnapshot(transaction, snapshotId);
  for (const { table, columns, rows } of tables(conversion)) {
    const count = await transaction.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table}`,
    );
    if (count?.count !== 0)
      throw new Error(`The target table ${table} is not empty.`);
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
    if (rows.length > 0) {
      const statement = await transaction.prepareAsync(sql);
      try {
        for (const row of rows) {
          await statement.executeAsync(...values(row, columns));
        }
      } finally {
        await statement.finalizeAsync();
      }
    }
  }
  await transaction.runAsync(
    "INSERT INTO conversion_reports(snapshot_id, converter_version, report) VALUES (?, 1, ?)",
    snapshotId,
    JSON.stringify(conversion.report),
  );
  const updated = await transaction.runAsync(
    "UPDATE bootstrap_state SET state = 'awaiting-verification' WHERE singleton = 1 AND state = 'source-captured'",
  );
  if (updated.changes !== 1)
    throw new Error("The conversion state changed unexpectedly.");
}

/** Call after reopening the target on a fresh connection, before normal writes. */
export async function verifyAndMarkLegacyDataReady(
  transaction: PopulationTransaction,
  snapshotId: number,
  verifiedAt: number,
) {
  const state = await transaction.getFirstAsync<{ state: string }>(
    "SELECT state FROM bootstrap_state WHERE singleton = 1",
  );
  if (state?.state !== "awaiting-verification")
    throw new Error("The database is not awaiting verification.");
  const integrity = await transaction.getFirstAsync<{
    integrity_check: string;
  }>("PRAGMA integrity_check");
  if (integrity?.integrity_check !== "ok")
    throw new Error("Database integrity check failed.");
  const foreignKeys = await transaction.getAllAsync<unknown>(
    "PRAGMA foreign_key_check",
  );
  if (foreignKeys.length !== 0)
    throw new Error("Database foreign-key check failed.");
  const conversion = await conversionFromSnapshot(transaction, snapshotId);
  const reportRow = await transaction.getFirstAsync<{ report: string }>(
    "SELECT report FROM conversion_reports WHERE snapshot_id = ? AND converter_version = 1 AND verified_at IS NULL",
    snapshotId,
  );
  if (reportRow?.report !== JSON.stringify(conversion.report)) {
    throw new Error(
      "The conversion report does not match the captured source.",
    );
  }
  for (const { table, columns, rows } of tables(conversion)) {
    const actual = await transaction.getAllAsync<Row>(
      `SELECT ${columns.join(", ")} FROM ${table}`,
    );
    const expectedValues = rows
      .map((row) => JSON.stringify(values(row, columns)))
      .sort();
    const actualValues = actual
      .map((row) => JSON.stringify(values(row, columns)))
      .sort();
    if (JSON.stringify(actualValues) !== JSON.stringify(expectedValues))
      throw new Error(`Conversion verification failed for ${table}.`);
  }
  const report = await transaction.runAsync(
    "UPDATE conversion_reports SET verified_at = ? WHERE snapshot_id = ? AND verified_at IS NULL",
    verifiedAt,
    snapshotId,
  );
  if (report.changes !== 1)
    throw new Error("The conversion report is missing or already verified.");
  const updatedState = await transaction.runAsync(
    "UPDATE bootstrap_state SET state = 'ready' WHERE singleton = 1 AND state = 'awaiting-verification'",
  );
  if (updatedState.changes !== 1)
    throw new Error("The database is not awaiting verification.");
}
