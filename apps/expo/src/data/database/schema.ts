/** The first relational schema. Persisted independently of legacy store versions. */
export const SCHEMA_VERSION = 1;

export const SCHEMA_V1 = `
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
CREATE TABLE bootstrap_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  database_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('source-captured', 'awaiting-verification', 'ready')),
  generation INTEGER NOT NULL DEFAULT 0 CHECK (generation >= 0)
);
CREATE TABLE conversion_snapshots (
  id INTEGER PRIMARY KEY,
  workout TEXT,
  exercises TEXT,
  restore_journal TEXT,
  captured_at INTEGER NOT NULL
);
CREATE TABLE conversion_reports (
  id INTEGER PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES conversion_snapshots(id) ON DELETE CASCADE,
  converter_version INTEGER NOT NULL,
  report TEXT NOT NULL,
  verified_at INTEGER
);
CREATE TABLE lifecycle_operations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE programs (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL,
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
);
CREATE TABLE session_lineages (
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  id TEXT NOT NULL CHECK (length(trim(id)) > 0),
  PRIMARY KEY (program_id, id)
);
CREATE TABLE sessions (
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  id TEXT NOT NULL CHECK (length(trim(id)) > 0),
  lineage_id TEXT,
  name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  status TEXT NOT NULL CHECK (status IN ('Planned', 'Ready', 'Done', 'Incomplete')),
  deload INTEGER NOT NULL CHECK (deload IN (0, 1)),
  start_ms INTEGER,
  end_ms INTEGER,
  last_activity_at_ms INTEGER,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  PRIMARY KEY (program_id, id),
  UNIQUE (program_id, position),
  FOREIGN KEY (program_id, lineage_id) REFERENCES session_lineages(program_id, id)
);
CREATE TABLE barbells (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  value REAL NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('lbs', 'kg'))
);
CREATE TABLE plates (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  value REAL NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('lbs', 'kg')),
  quantity REAL NOT NULL
);
CREATE TABLE exercises (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  load_kind TEXT CHECK (load_kind IN ('BARBELL', 'WEIGHT_PAIR', 'SINGLE_WEIGHT')),
  barbell_id TEXT REFERENCES barbells(id) ON DELETE SET NULL,
  one_rep_max_value REAL,
  one_rep_max_unit TEXT CHECK (one_rep_max_unit IN ('lbs', 'kg')),
  notes TEXT,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  CHECK ((one_rep_max_value IS NULL) = (one_rep_max_unit IS NULL))
);
CREATE UNIQUE INDEX exercises_active_name ON exercises(normalized_name) WHERE deleted = 0;
CREATE TABLE activities (
  program_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  id TEXT NOT NULL CHECK (length(trim(id)) > 0),
  exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  reps REAL,
  load_type TEXT CHECK (load_type IN ('PERCENT', 'RPE')),
  load_value REAL,
  rest_minutes REAL,
  PRIMARY KEY (program_id, session_id, id),
  UNIQUE (program_id, session_id, position),
  FOREIGN KEY (program_id, session_id) REFERENCES sessions(program_id, id) ON DELETE CASCADE,
  CHECK ((load_type IS NULL) = (load_value IS NULL))
);
CREATE TABLE workout_sets (
  program_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  id TEXT NOT NULL CHECK (length(trim(id)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('Warmup', 'Main')),
  position INTEGER NOT NULL CHECK (position >= 0),
  status TEXT NOT NULL CHECK (status IN ('Planned', 'Ready', 'Done', 'Incomplete')),
  feedback TEXT NOT NULL CHECK (feedback IN ('Easy', 'Neutral', 'Hard')),
  actual_reps REAL,
  weight_value REAL,
  weight_unit TEXT CHECK (weight_unit IN ('lbs', 'kg')),
  start_ms INTEGER,
  end_ms INTEGER,
  PRIMARY KEY (program_id, session_id, activity_id, id),
  UNIQUE (program_id, session_id, activity_id, kind, position),
  FOREIGN KEY (program_id, session_id, activity_id)
    REFERENCES activities(program_id, session_id, id) ON DELETE CASCADE,
  CHECK ((weight_value IS NULL) = (weight_unit IS NULL))
);
CREATE TABLE exercise_presets (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL,
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  load_kind TEXT CHECK (load_kind IN ('BARBELL', 'WEIGHT_PAIR', 'SINGLE_WEIGHT'))
);
CREATE TABLE muscle_labels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL
);
CREATE TABLE muscle_catalog (
  position INTEGER PRIMARY KEY CHECK (position >= 0),
  muscle_id INTEGER NOT NULL REFERENCES muscle_labels(id)
);
CREATE TABLE exercise_muscles (
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  muscle_id INTEGER NOT NULL REFERENCES muscle_labels(id),
  PRIMARY KEY (exercise_id, position)
);
CREATE TABLE preset_muscles (
  preset_id TEXT NOT NULL REFERENCES exercise_presets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  muscle_id INTEGER NOT NULL REFERENCES muscle_labels(id),
  PRIMARY KEY (preset_id, position)
);
CREATE INDEX sessions_lineage ON sessions(program_id, lineage_id, position);
CREATE INDEX sessions_start ON sessions(program_id, start_ms, position);
CREATE INDEX sessions_ready ON sessions(last_activity_at_ms) WHERE status = 'Ready';
CREATE INDEX activities_exercise ON activities(exercise_id, program_id, session_id);
CREATE INDEX activities_occurrence ON activities(program_id, session_id, exercise_id, position);
CREATE INDEX exercise_muscles_label ON exercise_muscles(muscle_id, exercise_id);
CREATE INDEX preset_muscles_label ON preset_muscles(muscle_id, preset_id);
`;
