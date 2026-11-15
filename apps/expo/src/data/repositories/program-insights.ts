import type { Db } from "../database/db";

type Status = "Planned" | "Ready" | "Done" | "Incomplete";
export interface InsightSession {
  id: string;
  status: Status;
  startMs: number | null;
}
export interface InsightSetFact {
  sessionId: string;
  activityId: string;
  exerciseId: string | null;
  exerciseName: string | null;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  maxValue: number | null;
  maxUnit: "lbs" | "kg" | null;
  plannedReps: number | null;
  loadType: "PERCENT" | "RPE" | null;
  loadValue: number | null;
  status: Status;
  feedback: "Easy" | "Neutral" | "Hard";
  actualReps: number | null;
  weightValue: number | null;
  weightUnit: "lbs" | "kg" | null;
}
export interface InsightMuscle {
  exerciseId: string;
  name: string;
}
export interface ProgramInsightFacts {
  programName: string;
  sessions: InsightSession[];
  sets: InsightSetFact[];
  muscles: InsightMuscle[];
}

/** Read compact facts in a single caller-owned read transaction. */
export function readProgramInsightFacts(
  reader: Db,
  programId: string,
): ProgramInsightFacts | null {
  const program = reader.getFirstSync<{ name: string }>(
    "SELECT name FROM programs WHERE id = ?",
    programId,
  );
  if (!program) return null;
  const sessions = reader.getAllSync<InsightSession>(
    "SELECT id, status, start_ms AS startMs FROM sessions WHERE program_id = ? ORDER BY position",
    programId,
  );
  const sets = reader.getAllSync<InsightSetFact>(
    `SELECT s.id AS sessionId, a.id AS activityId, a.exercise_id AS exerciseId,
       e.name AS exerciseName, e.load_kind AS loadKind, e.one_rep_max_value AS maxValue,
       e.one_rep_max_unit AS maxUnit, a.reps AS plannedReps, a.load_type AS loadType,
       a.load_value AS loadValue, w.status, w.feedback, w.actual_reps AS actualReps,
       w.weight_value AS weightValue, w.weight_unit AS weightUnit
     FROM sessions s JOIN activities a ON a.program_id = s.program_id AND a.session_id = s.id
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id AND w.kind = 'Main'
     LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE s.program_id = ? ORDER BY s.position, a.position, w.position`,
    programId,
  );
  const muscles = reader.getAllSync<InsightMuscle>(
    `SELECT m.exercise_id AS exerciseId, l.name FROM exercise_muscles m
     JOIN muscle_labels l ON l.id = m.muscle_id
     WHERE EXISTS (SELECT 1 FROM activities a WHERE a.exercise_id = m.exercise_id AND a.program_id = ?)
     ORDER BY m.exercise_id, m.position`,
    programId,
  );
  return { programName: program.name, sessions, sets, muscles };
}
