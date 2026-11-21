/**
 * Migration step 4: drop sets.
 *
 * `activities.drop_percent` is the fraction each drop set takes off the set
 * before it; NULL means the activity has no drop sets. Drop sets are workout
 * sets of kind 'Drop', performed after an activity's warmup and main sets.
 * Widening the kind check needs a rebuild of `workout_sets`; nothing
 * references it, so it is copied, dropped and renamed on its own.
 */
export const ACTIVITY_DROP_SETS_MIGRATION = `
ALTER TABLE activities ADD COLUMN drop_percent REAL
  CHECK (drop_percent IS NULL OR (drop_percent > 0 AND drop_percent < 1));
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
    REFERENCES activities(program_id, session_id, id) ON DELETE CASCADE,
  CHECK ((weight_value IS NULL) = (weight_unit IS NULL))
);
INSERT INTO workout_sets_next SELECT program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, weight_value, weight_unit, start_ms, end_ms FROM workout_sets;
DROP TABLE workout_sets;
ALTER TABLE workout_sets_next RENAME TO workout_sets;
`;
