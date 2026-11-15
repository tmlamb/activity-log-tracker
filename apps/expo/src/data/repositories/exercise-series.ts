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
export interface ExerciseSeriesFacts {
  reference: SetReference;
  selection: SeriesSelection;
  sessions: SeriesSession[];
  sets: SeriesSetFact[];
}

/** Read a single exercise occurrence per lineage session in one read snapshot. */
export function readExerciseSeriesFacts(
  reader: Db,
  reference: SetReference,
): ExerciseSeriesFacts | null {
  const { programId, sessionId, activityId, setId } = reference;
  const selection = reader.getFirstSync<SeriesSelection>(
    `SELECT s.name AS sessionName, e.name AS exerciseName, e.id AS exerciseId,
       s.lineage_id AS lineageId, e.one_rep_max_value AS maxValue, e.one_rep_max_unit AS maxUnit,
       (SELECT COUNT(*) FROM activities previous WHERE previous.program_id = a.program_id
         AND previous.session_id = a.session_id AND previous.exercise_id = a.exercise_id
         AND previous.position < a.position) AS occurrence
     FROM activities a JOIN sessions s ON s.program_id = a.program_id AND s.id = a.session_id
     JOIN exercises e ON e.id = a.exercise_id
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
     WHERE a.program_id = ? AND a.session_id = ? AND a.id = ? AND w.id = ? AND s.lineage_id IS NOT NULL`,
    programId,
    sessionId,
    activityId,
    setId,
  );
  if (!selection) return null;
  const sessions = reader.getAllSync<SeriesSession>(
    `SELECT id, start_ms AS startMs, end_ms AS endMs FROM sessions
     WHERE program_id = ? AND lineage_id = ? ORDER BY position`,
    programId,
    selection.lineageId,
  );
  const sets = reader.getAllSync<SeriesSetFact>(
    `WITH occurrences AS (
       SELECT a.program_id, a.session_id, a.id, a.reps, a.load_type, a.load_value,
         ROW_NUMBER() OVER (PARTITION BY a.session_id ORDER BY a.position) - 1 AS occurrence
       FROM sessions s JOIN activities a ON a.program_id = s.program_id AND a.session_id = s.id
       WHERE s.program_id = ? AND s.lineage_id = ? AND a.exercise_id = ?
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
    selection.occurrence,
    programId,
    selection.lineageId,
  );
  return { reference: { ...reference }, selection, sessions, sets };
}
