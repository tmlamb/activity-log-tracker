import type { Db } from "../database/db";
import type { prepareLegacyConversion } from "./conversion";

export type Conversion = ReturnType<typeof prepareLegacyConversion>;
type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

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
        "parent_activity_id",
        "superset_activity_id",
        "exercise_id",
        "position",
        "reps",
        "load_type",
        "load_value",
        "rest_minutes",
        "drop_percent",
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

/** Insert a prepared dataset into empty tables. Run inside a transaction. */
export function insertConvertedData(db: Db, conversion: Conversion) {
  for (const { table, columns, rows } of tables(conversion)) {
    const count = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table}`,
    );
    if (count?.count !== 0)
      throw new Error(`The target table ${table} is not empty.`);
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
    const statement = db.prepareSync(sql);
    try {
      for (const row of rows) statement.executeSync(...values(row, columns));
    } finally {
      statement.finalizeSync();
    }
  }
}
