import type { Db } from "../database/db";
import type { SessionDetail } from "./session-detail";
import { getSessionDetail } from "./session-detail";
import { getSessionPolicy } from "./session-policy";

export interface DeloadExercise {
  id: string;
  name: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  maxValue: number | null;
  maxUnit: "lbs" | "kg" | null;
}
export interface DeloadCandidateFacts {
  current: SessionDetail;
  previous: SessionDetail | null;
  exercises: DeloadExercise[];
}

/** Read at most two complete sessions, regardless of lineage history size. */
export function readDeloadCandidateFacts(
  reader: Db,
  programId: string,
  sessionId: string,
): DeloadCandidateFacts | null {
  const current = getSessionDetail(reader, programId, sessionId);
  if (!current) return null;
  if (current.status !== "Done" || current.lineageId === null)
    return { current, previous: null, exercises: [] };
  const policy = getSessionPolicy(reader, programId, sessionId);
  if (!policy?.canSetDeload) return { current, previous: null, exercises: [] };
  const previousRow = reader.getFirstSync<{ id: string }>(
    `SELECT previous.id FROM sessions current JOIN sessions previous ON previous.program_id = current.program_id
       AND previous.lineage_id = current.lineage_id AND previous.status = 'Done' AND previous.deload = 0
     WHERE current.program_id = ? AND current.id = ? AND (
       COALESCE(previous.start_ms, previous.end_ms, 0) < COALESCE(current.start_ms, current.end_ms, 0) OR
       (COALESCE(previous.start_ms, previous.end_ms, 0) = COALESCE(current.start_ms, current.end_ms, 0) AND previous.position < current.position))
     ORDER BY COALESCE(previous.start_ms, previous.end_ms, 0) DESC, previous.position DESC LIMIT 1`,
    programId,
    sessionId,
  );
  if (!previousRow) return { current, previous: null, exercises: [] };
  const previous = getSessionDetail(reader, programId, previousRow.id);
  if (!previous)
    throw new Error("The previous lineage session could not be loaded.");
  const exercises = reader.getAllSync<DeloadExercise>(
    `SELECT DISTINCT e.id, e.name, e.load_kind AS loadKind, e.one_rep_max_value AS maxValue, e.one_rep_max_unit AS maxUnit
     FROM activities a JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND a.session_id IN (?, ?)`,
    programId,
    sessionId,
    previous.id,
  );
  return { current, previous, exercises };
}
