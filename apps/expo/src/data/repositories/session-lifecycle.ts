import {
  LEGACY_SESSION_DURATION_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
} from "@activity-log/ui/utils";

import type { Db } from "../database/db";

interface Candidate {
  programId: string;
  sessionId: string;
  status: "Ready" | "Incomplete";
  startMs: number | null;
  endMs: number | null;
  lastActivityAtMs: number | null;
}

/**
 * SQL for whether a set of `workout_sets` was performed. A selected exercise's
 * set counts once it has reps; an alternative's only if it was marked done
 * before the alternative was swapped out.
 */
const PERFORMED = `(actual_reps > 0 AND (status = 'Done' OR EXISTS(
  SELECT 1 FROM activities a WHERE a.program_id = workout_sets.program_id
    AND a.session_id = workout_sets.session_id AND a.id = workout_sets.activity_id
    AND a.parent_activity_id IS NULL)))`;

/**
 * Equivalent to finalizeWorkoutSet for all sets owned by one session, except
 * alternatives' (see PERFORMED).
 */
function finalizeSets(
  transaction: Db,
  programId: string,
  sessionId: string,
  endMs: number,
) {
  transaction.runSync(
    `UPDATE workout_sets SET
       start_ms = CASE
         WHEN actual_reps > 0 AND status = 'Done' THEN start_ms
         WHEN ${PERFORMED} THEN CASE WHEN start_ms IS NOT NULL AND start_ms <= COALESCE(end_ms, ?)
           THEN start_ms ELSE COALESCE(end_ms, ?) END
         WHEN start_ms IS NULL THEN NULL
         WHEN start_ms <= COALESCE(end_ms, ?) THEN start_ms ELSE COALESCE(end_ms, ?) END,
       end_ms = CASE
         WHEN actual_reps > 0 AND status = 'Done' THEN end_ms
         WHEN ${PERFORMED} OR start_ms IS NOT NULL THEN COALESCE(end_ms, ?)
         ELSE end_ms END,
       status = CASE WHEN ${PERFORMED} THEN 'Done' ELSE 'Incomplete' END
     WHERE program_id = ? AND session_id = ?`,
    endMs,
    endMs,
    endMs,
    endMs,
    endMs,
    programId,
    sessionId,
  );
}

/** Complete a ready session or acknowledge an already timed-out session. */
export function completeSession(
  transaction: Db,
  programId: string,
  sessionId: string,
  requestedEndMs: number | null,
  nowMs: number,
): boolean {
  const current = transaction.getFirstSync<Candidate>(
    `SELECT program_id AS programId, id AS sessionId, status, start_ms AS startMs,
       end_ms AS endMs, last_activity_at_ms AS lastActivityAtMs
     FROM sessions WHERE program_id = ? AND id = ? AND status IN ('Ready', 'Incomplete')`,
    programId,
    sessionId,
  );
  if (!current) return false;
  const endMs =
    current.status === "Incomplete"
      ? (current.endMs ?? nowMs)
      : (requestedEndMs ?? nowMs);
  finalizeSets(transaction, programId, sessionId, endMs);
  transaction.runSync(
    `UPDATE sessions SET status = 'Done', end_ms = ?, last_activity_at_ms = ?, revision = revision + 1
     WHERE program_id = ? AND id = ?`,
    endMs,
    nowMs,
    programId,
    sessionId,
  );
  return true;
}

/** Visit only ready sessions that could have exceeded the inactivity timeout. */
export function cleanupInactiveSessions(transaction: Db, nowMs: number) {
  const candidates = transaction.getAllSync<Candidate>(
    `SELECT program_id AS programId, id AS sessionId, status, start_ms AS startMs,
       end_ms AS endMs, last_activity_at_ms AS lastActivityAtMs
     FROM sessions WHERE status = 'Ready'
       AND (last_activity_at_ms IS NULL OR last_activity_at_ms <= ?)`,
    nowMs - SESSION_INACTIVITY_TIMEOUT_MS,
  );
  const expired: { programId: string; sessionId: string }[] = [];
  for (const candidate of candidates) {
    let endMs = candidate.lastActivityAtMs;
    if (endMs === null) {
      const latest = transaction.getFirstSync<{ endMs: number | null }>(
        `SELECT MAX(end_ms) AS endMs FROM workout_sets
         WHERE program_id = ? AND session_id = ? AND status = 'Done'`,
        candidate.programId,
        candidate.sessionId,
      );
      endMs =
        latest?.endMs ??
        (candidate.startMs === null
          ? nowMs
          : candidate.startMs + LEGACY_SESSION_DURATION_MS);
    }
    finalizeSets(transaction, candidate.programId, candidate.sessionId, endMs);
    transaction.runSync(
      `UPDATE sessions SET status = 'Incomplete', end_ms = ?, last_activity_at_ms = ?, revision = revision + 1
       WHERE program_id = ? AND id = ? AND status = 'Ready'`,
      endMs,
      endMs,
      candidate.programId,
      candidate.sessionId,
    );
    expired.push({
      programId: candidate.programId,
      sessionId: candidate.sessionId,
    });
  }
  return expired;
}

export function setSessionDeload(
  transaction: Db,
  programId: string,
  sessionId: string,
  deload: boolean,
  nowMs: number,
) {
  const result = transaction.runSync(
    `UPDATE sessions SET deload = ?, last_activity_at_ms = ?, revision = revision + 1
     WHERE program_id = ? AND id = ?`,
    Number(deload),
    nowMs,
    programId,
    sessionId,
  );
  if (result.changes !== 1) throw new Error("Session not found.");
}

/** Reset execution while preserving planning, weights, feedback, and lineage. */
export function resetSession(
  transaction: Db,
  programId: string,
  sessionId: string,
  baseRevision: number,
  nowMs: number,
) {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid reset time.");
  const current = transaction.getFirstSync<{ revision: number }>(
    "SELECT revision FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    sessionId,
  );
  if (!current) throw new Error("Session not found.");
  if (current.revision !== baseRevision)
    throw new Error("The session changed. Reload before resetting.");
  transaction.runSync(
    `UPDATE workout_sets SET status = 'Planned', start_ms = NULL, end_ms = NULL, actual_reps = 0
     WHERE program_id = ? AND session_id = ?`,
    programId,
    sessionId,
  );
  const updated = transaction.runSync(
    `UPDATE sessions SET status = 'Planned', start_ms = NULL, end_ms = NULL,
       last_activity_at_ms = ?, revision = revision + 1
     WHERE program_id = ? AND id = ? AND revision = ?`,
    nowMs,
    programId,
    sessionId,
    baseRevision,
  );
  if (updated.changes !== 1)
    throw new Error("The session changed. Reload before resetting.");
}

export function deleteSession(
  transaction: Db,
  programId: string,
  sessionId: string,
  baseRevision: number,
) {
  const current = transaction.getFirstSync<{ revision: number }>(
    "SELECT revision FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    sessionId,
  );
  if (!current) throw new Error("Session not found.");
  if (current.revision !== baseRevision)
    throw new Error("The session changed. Reload before deleting.");
  transaction.runSync(
    "DELETE FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    sessionId,
  );
}
