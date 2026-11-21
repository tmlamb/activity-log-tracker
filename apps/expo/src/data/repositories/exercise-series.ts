import type { Db } from "../database/db";
import type { SetReference } from "./sets";

export interface SeriesSelection {
  sessionName: string;
  exerciseName: string;
  exerciseId: string;
  lineageId: string;
  occurrence: number;
  maxValue: number | null;
  maxUnit: "lbs" | "kg" | null;
  /** The selected activity (or the one it is an alternative of) is in a superset. */
  superset: boolean;
}
export interface SeriesSession {
  id: string;
  startMs: number | null;
  endMs: number | null;
}
export interface SeriesSetFact {
  sessionId: string;
  activityId: string;
  plannedReps: number | null;
  loadType: "PERCENT" | "RPE" | null;
  loadValue: number | null;
  id: string;
  kind: "Warmup" | "Main";
  status: "Planned" | "Ready" | "Done" | "Incomplete";
  feedback: "Easy" | "Neutral" | "Hard";
  actualReps: number | null;
  weightValue: number | null;
  weightUnit: "lbs" | "kg" | null;
  startMs: number | null;
  endMs: number | null;
}
/** An alternative of the selected activity, with the set to open it at. */
export interface SeriesAlternative {
  activityId: string;
  exerciseName: string;
  setId: string;
}
export interface ExerciseSeriesFacts {
  reference: SetReference;
  selection: SeriesSelection;
  sessions: SeriesSession[];
  sets: SeriesSetFact[];
  alternatives: SeriesAlternative[];
}

/**
 * Read a single exercise occurrence per lineage session in one read snapshot.
 * The reference may be an alternative: its history is the sessions where its
 * exercise was performed in its main activity's place.
 */
export function readExerciseSeriesFacts(
  reader: Db,
  reference: SetReference,
): ExerciseSeriesFacts | null {
  const { programId, sessionId, activityId, setId } = reference;
  const selected = reader.getFirstSync<
    Omit<SeriesSelection, "superset"> & { superset: number }
  >(
    `SELECT s.name AS sessionName, e.name AS exerciseName, e.id AS exerciseId,
       s.lineage_id AS lineageId, e.one_rep_max_value AS maxValue, e.one_rep_max_unit AS maxUnit,
       (SELECT COUNT(*) FROM activities previous WHERE previous.program_id = a.program_id
         AND previous.session_id = a.session_id AND previous.exercise_id = a.exercise_id
         AND previous.parent_activity_id IS NULL
         AND previous.position < COALESCE(parent.position, a.position)) AS occurrence,
       (COALESCE(parent.superset_activity_id, a.superset_activity_id) IS NOT NULL
         OR EXISTS(SELECT 1 FROM activities member WHERE member.program_id = a.program_id
           AND member.session_id = a.session_id
           AND member.superset_activity_id = COALESCE(parent.id, a.id))) AS superset
     FROM activities a JOIN sessions s ON s.program_id = a.program_id AND s.id = a.session_id
     LEFT JOIN activities parent ON parent.program_id = a.program_id
       AND parent.session_id = a.session_id AND parent.id = a.parent_activity_id
     JOIN exercises e ON e.id = a.exercise_id
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
     WHERE a.program_id = ? AND a.session_id = ? AND a.id = ? AND w.id = ? AND s.lineage_id IS NOT NULL`,
    programId,
    sessionId,
    activityId,
    setId,
  );
  if (!selected) return null;
  const selection: SeriesSelection = {
    ...selected,
    superset: selected.superset === 1,
  };
  const sessions = reader.getAllSync<SeriesSession>(
    `SELECT id, start_ms AS startMs, end_ms AS endMs FROM sessions
     WHERE program_id = ? AND lineage_id = ? ORDER BY position`,
    programId,
    selection.lineageId,
  );
  // Other sessions match the exercise's occurrence among main activities; the
  // current session is always the referenced activity, main or alternative.
  const sets = reader.getAllSync<SeriesSetFact>(
    `WITH occurrences AS (
       SELECT a.program_id, a.session_id, a.id, a.reps, a.load_type, a.load_value,
         ROW_NUMBER() OVER (PARTITION BY a.session_id ORDER BY a.position) - 1 AS occurrence
       FROM sessions s JOIN activities a ON a.program_id = s.program_id AND a.session_id = s.id
       WHERE s.program_id = ? AND s.lineage_id = ? AND a.exercise_id = ?
         AND a.parent_activity_id IS NULL AND s.id <> ?
       UNION ALL
       SELECT program_id, session_id, id, reps, load_type, load_value, ? AS occurrence
       FROM activities WHERE program_id = ? AND session_id = ? AND id = ?
     )
     SELECT s.id AS sessionId, a.id AS activityId, a.reps AS plannedReps,
       a.load_type AS loadType, a.load_value AS loadValue, w.id, w.kind, w.status, w.feedback,
       w.actual_reps AS actualReps, w.weight_value AS weightValue, w.weight_unit AS weightUnit,
       w.start_ms AS startMs, w.end_ms AS endMs
     FROM sessions s JOIN occurrences a ON a.program_id = s.program_id AND a.session_id = s.id AND a.occurrence = ?
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
     WHERE s.program_id = ? AND s.lineage_id = ? ORDER BY s.position, w.kind, w.position`,
    programId,
    selection.lineageId,
    selection.exerciseId,
    sessionId,
    selection.occurrence,
    programId,
    sessionId,
    activityId,
    selection.occurrence,
    programId,
    selection.lineageId,
  );
  // Open each alternative at the set matching the selected one, or else at its
  // first main set, or else its first set.
  const alternatives = reader.getAllSync<
    Omit<SeriesAlternative, "setId"> & { setId: string | null }
  >(
    `WITH selected AS (
       SELECT kind, position FROM workout_sets
       WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?
     )
     SELECT a.id AS activityId, e.name AS exerciseName,
       (SELECT w.id FROM workout_sets w
        WHERE w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
        ORDER BY (w.kind = (SELECT kind FROM selected) AND w.position = (SELECT position FROM selected)) DESC,
          w.kind = 'Main' DESC, w.position
        LIMIT 1) AS setId
     FROM activities a JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND a.session_id = ? AND a.parent_activity_id = ?
     ORDER BY a.position`,
    programId,
    sessionId,
    activityId,
    setId,
    programId,
    sessionId,
    activityId,
  );
  return {
    reference: { ...reference },
    selection,
    sessions,
    sets,
    // An alternative without sets has nothing to show.
    alternatives: alternatives.flatMap(
      ({ setId: alternativeSetId, ...item }) =>
        alternativeSetId === null ? [] : [{ ...item, setId: alternativeSetId }],
    ),
  };
}
