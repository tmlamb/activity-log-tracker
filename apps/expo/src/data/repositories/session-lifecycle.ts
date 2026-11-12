import {
  LEGACY_SESSION_DURATION_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
} from "@activity-log/ui/utils";

interface LifecycleTransaction {
  getFirstAsync<T>(
    sql: string,
    ...parameters: (string | number | null)[]
  ): Promise<T | null>;
  getAllAsync<T>(
    sql: string,
    ...parameters: (string | number | null)[]
  ): Promise<T[]>;
  runAsync(
    sql: string,
    ...parameters: (string | number | null)[]
  ): Promise<{ changes: number }>;
}

interface Candidate {
  programId: string;
  sessionId: string;
  status: "Ready" | "Incomplete";
  startMs: number | null;
  endMs: number | null;
  lastActivityAtMs: number | null;
}

/** Equivalent to finalizeWorkoutSet for all sets owned by one session. */
async function finalizeSets(
  transaction: LifecycleTransaction,
  programId: string,
  sessionId: string,
  endMs: number,
) {
  await transaction.runAsync(
    `UPDATE workout_sets SET
       start_ms = CASE
         WHEN actual_reps > 0 AND status = 'Done' THEN start_ms
         WHEN actual_reps > 0 THEN CASE WHEN start_ms IS NOT NULL AND start_ms <= COALESCE(end_ms, ?)
           THEN start_ms ELSE COALESCE(end_ms, ?) END
         WHEN start_ms IS NULL THEN NULL
         WHEN start_ms <= COALESCE(end_ms, ?) THEN start_ms ELSE COALESCE(end_ms, ?) END,
       end_ms = CASE
         WHEN actual_reps > 0 AND status = 'Done' THEN end_ms
         WHEN actual_reps > 0 OR start_ms IS NOT NULL THEN COALESCE(end_ms, ?)
         ELSE end_ms END,
       status = CASE WHEN actual_reps > 0 THEN 'Done' ELSE 'Incomplete' END
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
export async function completeSession(
  transaction: LifecycleTransaction,
  programId: string,
  sessionId: string,
  requestedEndMs: number | null,
  nowMs: number,
): Promise<boolean> {
  const current = await transaction.getFirstAsync<Candidate>(
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
  await finalizeSets(transaction, programId, sessionId, endMs);
  await transaction.runAsync(
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
export async function cleanupInactiveSessions(
  transaction: LifecycleTransaction,
  nowMs: number,
) {
  const candidates = await transaction.getAllAsync<Candidate>(
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
      const latest = await transaction.getFirstAsync<{ endMs: number | null }>(
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
    await finalizeSets(
      transaction,
      candidate.programId,
      candidate.sessionId,
      endMs,
    );
    await transaction.runAsync(
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
