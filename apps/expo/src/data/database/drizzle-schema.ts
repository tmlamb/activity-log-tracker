import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const statuses = ["Planned", "Ready", "Done", "Incomplete"] as const;
const units = ["lbs", "kg"] as const;
const loadKinds = ["BARBELL", "WEIGHT_PAIR", "SINGLE_WEIGHT"] as const;

export const schemaMigrations = sqliteTable("schema_migrations", {
  version: integer("version").primaryKey(),
  appliedAt: integer("applied_at").notNull(),
});

export const bootstrapState = sqliteTable(
  "bootstrap_state",
  {
    singleton: integer("singleton").primaryKey(),
    databaseId: text("database_id").notNull(),
    state: text("state", {
      enum: ["source-captured", "awaiting-verification", "ready"],
    }).notNull(),
    generation: integer("generation").notNull().default(0),
  },
  (t) => [
    check("bootstrap_singleton", sql`${t.singleton} = 1`),
    check(
      "bootstrap_state_valid",
      sql`${t.state} IN ('source-captured', 'awaiting-verification', 'ready')`,
    ),
    check("bootstrap_generation_nonnegative", sql`${t.generation} >= 0`),
  ],
);

export const conversionSnapshots = sqliteTable("conversion_snapshots", {
  id: integer("id").primaryKey(),
  workout: text("workout"),
  exercises: text("exercises"),
  restoreJournal: text("restore_journal"),
  capturedAt: integer("captured_at").notNull(),
});

export const conversionReports = sqliteTable("conversion_reports", {
  id: integer("id").primaryKey(),
  snapshotId: integer("snapshot_id")
    .notNull()
    .references(() => conversionSnapshots.id, { onDelete: "cascade" }),
  converterVersion: integer("converter_version").notNull(),
  report: text("report").notNull(),
  verifiedAt: integer("verified_at"),
});

export const lifecycleOperations = sqliteTable("lifecycle_operations", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  state: text("state").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const programs = sqliteTable(
  "programs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    position: integer("position").notNull().unique(),
  },
  (t) => [
    check("program_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("program_position_nonnegative", sql`${t.position} >= 0`),
  ],
);

export const sessionLineages = sqliteTable(
  "session_lineages",
  {
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.id] }),
    check("lineage_id_nonempty", sql`length(trim(${t.id})) > 0`),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    lineageId: text("lineage_id"),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    status: text("status", { enum: statuses }).notNull(),
    deload: integer("deload").notNull(),
    startMs: integer("start_ms"),
    endMs: integer("end_ms"),
    lastActivityAtMs: integer("last_activity_at_ms"),
    revision: integer("revision").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.id] }),
    unique().on(t.programId, t.position),
    foreignKey({
      columns: [t.programId, t.lineageId],
      foreignColumns: [sessionLineages.programId, sessionLineages.id],
    }),
    check("session_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("session_position_nonnegative", sql`${t.position} >= 0`),
    check(
      "session_status_valid",
      sql`${t.status} IN ('Planned', 'Ready', 'Done', 'Incomplete')`,
    ),
    check("session_deload_valid", sql`${t.deload} IN (0, 1)`),
    check("session_revision_nonnegative", sql`${t.revision} >= 0`),
    index("sessions_lineage").on(t.programId, t.lineageId, t.position),
    index("sessions_start").on(t.programId, t.startMs, t.position),
    index("sessions_ready")
      .on(t.lastActivityAtMs)
      .where(sql`${t.status} = 'Ready'`),
    index("sessions_lineage_completed_chrono")
      .on(
        t.programId,
        t.lineageId,
        sql`COALESCE(${t.startMs}, ${t.endMs}, 0) DESC`,
        sql`${t.position} DESC`,
      )
      .where(sql`${t.status} = 'Done'`),
  ],
);

export const barbells = sqliteTable(
  "barbells",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull().unique(),
    value: real("value").notNull(),
    unit: text("unit", { enum: units }).notNull(),
  },
  (t) => [
    check("barbell_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("barbell_position_nonnegative", sql`${t.position} >= 0`),
    check("barbell_unit_valid", sql`${t.unit} IN ('lbs', 'kg')`),
  ],
);

export const plates = sqliteTable(
  "plates",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull().unique(),
    value: real("value").notNull(),
    unit: text("unit", { enum: units }).notNull(),
    quantity: real("quantity").notNull(),
  },
  (t) => [
    check("plate_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("plate_position_nonnegative", sql`${t.position} >= 0`),
    check("plate_unit_valid", sql`${t.unit} IN ('lbs', 'kg')`),
  ],
);

export const exercises = sqliteTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    position: integer("position").notNull().unique(),
    loadKind: text("load_kind", { enum: loadKinds }),
    barbellId: text("barbell_id").references(() => barbells.id, {
      onDelete: "set null",
    }),
    oneRepMaxValue: real("one_rep_max_value"),
    oneRepMaxUnit: text("one_rep_max_unit", { enum: units }),
    notes: text("notes"),
    deleted: integer("deleted").notNull().default(0),
    revision: integer("revision").notNull().default(0),
  },
  (t) => [
    check("exercise_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("exercise_position_nonnegative", sql`${t.position} >= 0`),
    check(
      "exercise_load_kind_valid",
      sql`${t.loadKind} IN ('BARBELL', 'WEIGHT_PAIR', 'SINGLE_WEIGHT')`,
    ),
    check("exercise_unit_valid", sql`${t.oneRepMaxUnit} IN ('lbs', 'kg')`),
    check(
      "exercise_weight_pair",
      sql`(${t.oneRepMaxValue} IS NULL) = (${t.oneRepMaxUnit} IS NULL)`,
    ),
    check("exercise_deleted_valid", sql`${t.deleted} IN (0, 1)`),
    check("exercise_revision_nonnegative", sql`${t.revision} >= 0`),
    uniqueIndex("exercises_active_name")
      .on(t.normalizedName)
      .where(sql`${t.deleted} = 0`),
  ],
);

export const activities = sqliteTable(
  "activities",
  {
    programId: text("program_id").notNull(),
    sessionId: text("session_id").notNull(),
    id: text("id").notNull(),
    exerciseId: text("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull(),
    reps: real("reps"),
    loadType: text("load_type", { enum: ["PERCENT", "RPE"] }),
    loadValue: real("load_value"),
    restMinutes: real("rest_minutes"),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.sessionId, t.id] }),
    unique().on(t.programId, t.sessionId, t.position),
    foreignKey({
      columns: [t.programId, t.sessionId],
      foreignColumns: [sessions.programId, sessions.id],
    }).onDelete("cascade"),
    check("activity_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("activity_position_nonnegative", sql`${t.position} >= 0`),
    check("activity_load_type_valid", sql`${t.loadType} IN ('PERCENT', 'RPE')`),
    check(
      "activity_load_pair",
      sql`(${t.loadType} IS NULL) = (${t.loadValue} IS NULL)`,
    ),
    index("activities_exercise").on(t.exerciseId, t.programId, t.sessionId),
    index("activities_occurrence").on(
      t.programId,
      t.sessionId,
      t.exerciseId,
      t.position,
    ),
  ],
);

export const workoutSets = sqliteTable(
  "workout_sets",
  {
    programId: text("program_id").notNull(),
    sessionId: text("session_id").notNull(),
    activityId: text("activity_id").notNull(),
    id: text("id").notNull(),
    kind: text("kind", { enum: ["Warmup", "Main"] }).notNull(),
    position: integer("position").notNull(),
    status: text("status", { enum: statuses }).notNull(),
    feedback: text("feedback", { enum: ["Easy", "Neutral", "Hard"] }).notNull(),
    actualReps: real("actual_reps"),
    weightValue: real("weight_value"),
    weightUnit: text("weight_unit", { enum: units }),
    startMs: integer("start_ms"),
    endMs: integer("end_ms"),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.sessionId, t.activityId, t.id] }),
    unique().on(t.programId, t.sessionId, t.activityId, t.kind, t.position),
    foreignKey({
      columns: [t.programId, t.sessionId, t.activityId],
      foreignColumns: [
        activities.programId,
        activities.sessionId,
        activities.id,
      ],
    }).onDelete("cascade"),
    check("set_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("set_position_nonnegative", sql`${t.position} >= 0`),
    check("set_kind_valid", sql`${t.kind} IN ('Warmup', 'Main')`),
    check(
      "set_status_valid",
      sql`${t.status} IN ('Planned', 'Ready', 'Done', 'Incomplete')`,
    ),
    check(
      "set_feedback_valid",
      sql`${t.feedback} IN ('Easy', 'Neutral', 'Hard')`,
    ),
    check("set_unit_valid", sql`${t.weightUnit} IN ('lbs', 'kg')`),
    check(
      "set_weight_pair",
      sql`(${t.weightValue} IS NULL) = (${t.weightUnit} IS NULL)`,
    ),
  ],
);

export const exercisePresets = sqliteTable(
  "exercise_presets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    position: integer("position").notNull().unique(),
    loadKind: text("load_kind", { enum: loadKinds }),
  },
  (t) => [
    check("preset_id_nonempty", sql`length(trim(${t.id})) > 0`),
    check("preset_position_nonnegative", sql`${t.position} >= 0`),
    check(
      "preset_load_kind_valid",
      sql`${t.loadKind} IN ('BARBELL', 'WEIGHT_PAIR', 'SINGLE_WEIGHT')`,
    ),
  ],
);

export const muscleLabels = sqliteTable("muscle_labels", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  normalizedName: text("normalized_name").notNull(),
});
export const muscleCatalog = sqliteTable(
  "muscle_catalog",
  {
    position: integer("position").primaryKey(),
    muscleId: integer("muscle_id")
      .notNull()
      .references(() => muscleLabels.id),
  },
  (t) => [
    check("muscle_catalog_position_nonnegative", sql`${t.position} >= 0`),
  ],
);
export const exerciseMuscles = sqliteTable(
  "exercise_muscles",
  {
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    muscleId: integer("muscle_id")
      .notNull()
      .references(() => muscleLabels.id),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.position] }),
    check("exercise_muscle_position_nonnegative", sql`${t.position} >= 0`),
    index("exercise_muscles_label").on(t.muscleId, t.exerciseId),
  ],
);
export const presetMuscles = sqliteTable(
  "preset_muscles",
  {
    presetId: text("preset_id")
      .notNull()
      .references(() => exercisePresets.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    muscleId: integer("muscle_id")
      .notNull()
      .references(() => muscleLabels.id),
  },
  (t) => [
    primaryKey({ columns: [t.presetId, t.position] }),
    check("preset_muscle_position_nonnegative", sql`${t.position} >= 0`),
    index("preset_muscles_label").on(t.muscleId, t.presetId),
  ],
);
