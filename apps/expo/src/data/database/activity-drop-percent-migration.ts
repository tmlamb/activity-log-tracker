/**
 * Migration step 5: a drop percentage of zero.
 *
 * A 0% drop repeats the previous set's weight, so `activities.drop_percent`
 * now allows 0 (step 4 required more than 0). Changing a check needs a
 * rebuild, done as in step 3: `workout_sets` is copied aside before
 * `activities` is dropped so nothing cascades.
 */
export const ACTIVITY_DROP_PERCENT_MIGRATION = `
CREATE TABLE activities_next (
  program_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  id TEXT NOT NULL CHECK (length(trim(id)) > 0),
  parent_activity_id TEXT,
  superset_activity_id TEXT,
  exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  reps REAL,
  load_type TEXT CHECK (load_type IN ('PERCENT', 'RPE')),
  load_value REAL,
  rest_minutes REAL,
  drop_percent REAL CHECK (drop_percent IS NULL OR (drop_percent >= 0 AND drop_percent < 1)),
  PRIMARY KEY (program_id, session_id, id),
  FOREIGN KEY (program_id, session_id) REFERENCES sessions(program_id, id) ON DELETE CASCADE,
  FOREIGN KEY (program_id, session_id, parent_activity_id)
    REFERENCES activities_next(program_id, session_id, id) ON DELETE CASCADE,
  FOREIGN KEY (program_id, session_id, superset_activity_id)
    REFERENCES activities_next(program_id, session_id, id) ON DELETE CASCADE,
  CHECK (parent_activity_id IS NULL OR parent_activity_id <> id),
  CHECK (superset_activity_id IS NULL OR (parent_activity_id IS NULL AND superset_activity_id <> id)),
  CHECK ((load_type IS NULL) = (load_value IS NULL))
);
INSERT INTO activities_next(program_id, session_id, id, parent_activity_id, superset_activity_id, exercise_id, position, reps, load_type, load_value, rest_minutes, drop_percent)
  SELECT program_id, session_id, id, parent_activity_id, superset_activity_id, exercise_id, position, reps, load_type, load_value, rest_minutes, drop_percent FROM activities;
CREATE TABLE workout_sets_next (
  program_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  id TEXT NOT NULL CHECK (length(trim(id)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('Warmup', 'Main', 'Drop')),
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
    REFERENCES activities_next(program_id, session_id, id) ON DELETE CASCADE,
  CHECK ((weight_value IS NULL) = (weight_unit IS NULL))
);
INSERT INTO workout_sets_next SELECT program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, weight_value, weight_unit, start_ms, end_ms FROM workout_sets;
DROP TABLE workout_sets;
DROP TABLE activities;
ALTER TABLE activities_next RENAME TO activities;
ALTER TABLE workout_sets_next RENAME TO workout_sets;
CREATE UNIQUE INDEX activities_main_position
  ON activities(program_id, session_id, position) WHERE parent_activity_id IS NULL;
CREATE UNIQUE INDEX activities_alternative_position
  ON activities(program_id, session_id, parent_activity_id, position) WHERE parent_activity_id IS NOT NULL;
CREATE INDEX activities_superset
  ON activities(program_id, session_id, superset_activity_id) WHERE superset_activity_id IS NOT NULL;
CREATE INDEX activities_exercise ON activities(exercise_id, program_id, session_id);
CREATE INDEX activities_occurrence ON activities(program_id, session_id, exercise_id, position);
`;
