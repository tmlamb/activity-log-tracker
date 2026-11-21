import type { Db } from "../database/db";
import { kindRankSql } from "./sets";

type Status = "Planned" | "Ready" | "Done" | "Incomplete";
export interface InsightSession {
  id: string;
  status: Status;
  startMs: number | null;
}
/** The kinds of set that count as training: main sets and drop sets. */
type WorkKind = "Main" | "Drop";
export interface InsightSetFact {
  sessionId: string;
  activityId: string;
  kind: WorkKind;
  /** The set's number among its activity's sets of `kind`, from 0. */
  position: number;
  exerciseId: string | null;
  exerciseName: string | null;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  maxValue: number | null;
  maxUnit: "lbs" | "kg" | null;
  plannedReps: number | null;
  loadType: "PERCENT" | "RPE" | null;
  loadValue: number | null;
  dropPercent: number | null;
  status: Status;
  feedback: "Easy" | "Neutral" | "Hard";
  actualReps: number | null;
  weightValue: number | null;
  weightUnit: "lbs" | "kg" | null;
}
/**
 * Completed main or drop sets with the same session, exercise, kind and
 * weight, summed.
 */
export interface InsightCompletedGroup {
  sessionId: string;
  kind: WorkKind;
  exerciseId: string | null;
  exerciseName: string | null;
  loadKind: InsightSetFact["loadKind"];
  weightValue: number | null;
  weightUnit: "lbs" | "kg" | null;
  sets: number;
  reps: number;
  hardSets: number;
  easySets: number;
}
/**
 * One set of an activity with planned drop sets, in performing order: what a
 * planned drop set's weight follows from (see plannedDropSetWeight).
 */
export interface InsightDropBasis {
  sessionId: string;
  activityId: string;
  kind: "Warmup" | WorkKind;
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
  /** Completed sets, grouped in SQL: the bulk of a long history. */
  completed: InsightCompletedGroup[];
  /** Every other main or drop set (pending, partial or skipped), one row each. */
  sets: InsightSetFact[];
  /** Every set of the activities whose drop sets are still to be performed. */
  dropBasis: InsightDropBasis[];
  muscles: InsightMuscle[];
}

/** Read the facts program insights are computed from. */
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
  const completed = reader.getAllSync<InsightCompletedGroup>(
    `SELECT a.session_id AS sessionId, w.kind, a.exercise_id AS exerciseId, e.name AS exerciseName,
       e.load_kind AS loadKind, w.weight_value AS weightValue, w.weight_unit AS weightUnit,
       COUNT(*) AS sets, SUM(w.actual_reps) AS reps,
       SUM(w.feedback = 'Hard') AS hardSets, SUM(w.feedback = 'Easy') AS easySets
     FROM activities a
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id AND w.kind IN ('Main', 'Drop')
     LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND w.status = 'Done' AND w.actual_reps > 0
     GROUP BY a.session_id, a.exercise_id, w.kind, w.weight_unit, w.weight_value`,
    programId,
  );
  const sets = reader.getAllSync<InsightSetFact>(
    `SELECT s.id AS sessionId, a.id AS activityId, w.kind, w.position, a.exercise_id AS exerciseId,
       e.name AS exerciseName, e.load_kind AS loadKind, e.one_rep_max_value AS maxValue,
       e.one_rep_max_unit AS maxUnit, a.reps AS plannedReps, a.load_type AS loadType,
       a.load_value AS loadValue, a.drop_percent AS dropPercent, w.status, w.feedback, w.actual_reps AS actualReps,
       w.weight_value AS weightValue, w.weight_unit AS weightUnit
     FROM sessions s JOIN activities a ON a.program_id = s.program_id AND a.session_id = s.id
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id AND w.kind IN ('Main', 'Drop')
     LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE s.program_id = ? AND NOT (w.status = 'Done' AND COALESCE(w.actual_reps, 0) > 0)
       -- Unperformed alternatives aren't missed work; only main activities count.
       AND a.parent_activity_id IS NULL
     ORDER BY s.position, a.position, ${kindRankSql("w.kind")}, w.position`,
    programId,
  );
  const dropBasis = reader.getAllSync<InsightDropBasis>(
    `SELECT w.session_id AS sessionId, w.activity_id AS activityId, w.kind,
       w.weight_value AS weightValue, w.weight_unit AS weightUnit
     FROM sessions s JOIN workout_sets w ON w.program_id = s.program_id AND w.session_id = s.id
     WHERE s.program_id = ? AND s.status IN ('Planned', 'Ready')
       AND EXISTS (SELECT 1 FROM workout_sets d WHERE d.program_id = w.program_id
         AND d.session_id = w.session_id AND d.activity_id = w.activity_id
         AND d.kind = 'Drop' AND d.status IN ('Planned', 'Ready'))
     ORDER BY w.session_id, w.activity_id, ${kindRankSql("w.kind")}, w.position`,
    programId,
  );
  const muscles = reader.getAllSync<InsightMuscle>(
    `SELECT m.exercise_id AS exerciseId, l.name FROM exercise_muscles m
     JOIN muscle_labels l ON l.id = m.muscle_id
     WHERE EXISTS (SELECT 1 FROM activities a WHERE a.exercise_id = m.exercise_id AND a.program_id = ?)
     ORDER BY m.exercise_id, m.position`,
    programId,
  );
  return {
    programName: program.name,
    sessions,
    completed,
    sets,
    dropBasis,
    muscles,
  };
}
