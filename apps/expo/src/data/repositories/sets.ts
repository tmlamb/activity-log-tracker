type Status = "Planned" | "Ready" | "Done" | "Incomplete";
type Feedback = "Easy" | "Neutral" | "Hard";
type Unit = "lbs" | "kg";

interface SetTransaction {
  getFirstAsync<T>(
    sql: string,
    ...parameters: (string | number | null)[]
  ): Promise<T | null>;
  runAsync(
    sql: string,
    ...parameters: (string | number | null)[]
  ): Promise<{ changes: number }>;
}

export interface SetReference {
  programId: string;
  sessionId: string;
  activityId: string;
  setId: string;
}

export interface SetRecording {
  actualReps: number | null;
  weight: { value: number; unit: Unit } | null;
  feedback: Feedback;
  status: Status;
  startMs: number | null;
  endMs: number | null;
}

export interface SetMeasurements {
  actualReps: number | null;
  weight: { value: number; unit: Unit } | null;
  feedback: Feedback;
}

interface CurrentSet {
  sessionStatus: Status;
  setStatus: Status;
  kind: "Warmup" | "Main";
  position: number;
  startMs: number | null;
}

async function getCurrentSet(
  transaction: SetTransaction,
  reference: SetReference,
): Promise<CurrentSet> {
  const current = await transaction.getFirstAsync<CurrentSet>(
    `SELECT session.status AS sessionStatus, workout_set.status AS setStatus,
       workout_set.kind, workout_set.position, workout_set.start_ms AS startMs
     FROM workout_sets workout_set
     JOIN sessions session ON session.program_id = workout_set.program_id
       AND session.id = workout_set.session_id
     WHERE workout_set.program_id = ? AND workout_set.session_id = ?
       AND workout_set.activity_id = ? AND workout_set.id = ?`,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  if (!current) throw new Error("Workout set not found");
  return current;
}

function validateMeasurements(measurements: SetMeasurements, nowMs: number) {
  if (
    !Number.isFinite(nowMs) ||
    (measurements.actualReps !== null &&
      !Number.isFinite(measurements.actualReps)) ||
    (measurements.weight !== null &&
      !Number.isFinite(measurements.weight.value))
  ) {
    throw new Error("Workout set values must be finite numbers.");
  }
}

/** Start the first pending set and, when necessary, its planned session. */
export async function startSet(
  transaction: SetTransaction,
  reference: SetReference,
  measurements: SetMeasurements,
  nowMs: number,
) {
  validateMeasurements(measurements, nowMs);
  const current = await getCurrentSet(transaction, reference);
  if (
    (current.sessionStatus !== "Planned" &&
      current.sessionStatus !== "Ready") ||
    current.setStatus !== "Planned"
  ) {
    throw new Error("Workout set cannot be started.");
  }
  const firstPending = await transaction.getFirstAsync<{ id: string }>(
    `SELECT id FROM workout_sets
     WHERE program_id = ? AND session_id = ? AND activity_id = ?
       AND status IN ('Planned', 'Ready')
     ORDER BY CASE kind WHEN 'Warmup' THEN 0 ELSE 1 END, position LIMIT 1`,
    reference.programId,
    reference.sessionId,
    reference.activityId,
  );
  if (firstPending?.id !== reference.setId) {
    throw new Error("Only the first pending set can be started.");
  }
  const result = await transaction.runAsync(
    `UPDATE workout_sets SET actual_reps = ?, weight_value = ?, weight_unit = ?,
       feedback = ?, start_ms = ?, status = 'Ready'
     WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ? AND status = 'Planned'`,
    measurements.actualReps,
    measurements.weight?.value ?? null,
    measurements.weight?.unit ?? null,
    measurements.feedback,
    nowMs,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  if (result.changes !== 1)
    throw new Error("Workout set could not be started.");
  await transaction.runAsync(
    `UPDATE sessions SET start_ms = CASE WHEN status = 'Planned' THEN ? ELSE start_ms END,
       status = CASE WHEN status = 'Planned' THEN 'Ready' ELSE status END,
       last_activity_at_ms = ?, revision = revision + 1
     WHERE program_id = ? AND id = ?`,
    nowMs,
    nowMs,
    reference.programId,
    reference.sessionId,
  );
}

/** Complete a ready set and start the immediately following planned set. */
export async function completeSetAndAdvance(
  transaction: SetTransaction,
  reference: SetReference,
  measurements: SetMeasurements,
  nowMs: number,
): Promise<string | null> {
  validateMeasurements(measurements, nowMs);
  const current = await getCurrentSet(transaction, reference);
  if (
    current.sessionStatus !== "Ready" ||
    current.setStatus !== "Ready" ||
    measurements.actualReps === null ||
    measurements.actualReps <= 0
  ) {
    throw new Error("Workout set cannot be completed.");
  }
  const endMs =
    current.startMs === null
      ? nowMs
      : Math.min(nowMs, current.startMs + 20 * 60 * 1000);
  const result = await transaction.runAsync(
    `UPDATE workout_sets SET actual_reps = ?, weight_value = ?, weight_unit = ?,
       feedback = ?, end_ms = ?, status = 'Done'
     WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ? AND status = 'Ready'`,
    measurements.actualReps,
    measurements.weight?.value ?? null,
    measurements.weight?.unit ?? null,
    measurements.feedback,
    endMs,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  if (result.changes !== 1)
    throw new Error("Workout set could not be completed.");
  const next = await transaction.getFirstAsync<{ id: string; status: Status }>(
    `SELECT id, status FROM workout_sets
     WHERE program_id = ? AND session_id = ? AND activity_id = ?
       AND ((kind = ? AND position > ?) OR (? = 'Warmup' AND kind = 'Main'))
     ORDER BY CASE kind WHEN 'Warmup' THEN 0 ELSE 1 END, position LIMIT 1`,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    current.kind,
    current.position,
    current.kind,
  );
  let nextId: string | null = null;
  if (next?.status === "Planned") {
    const advanced = await transaction.runAsync(
      `UPDATE workout_sets SET start_ms = ?, status = 'Ready'
       WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ? AND status = 'Planned'`,
      nowMs,
      reference.programId,
      reference.sessionId,
      reference.activityId,
      next.id,
    );
    if (advanced.changes !== 1)
      throw new Error("The next workout set could not be started.");
    nextId = next.id;
  }
  await transaction.runAsync(
    "UPDATE sessions SET last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
    nowMs,
    reference.programId,
    reference.sessionId,
  );
  return nextId;
}

/**
 * Persist one set and its session's activity timestamp in one writer
 * transaction. Terminal session status and set timestamps cannot be reopened
 * by a stale recording submission.
 */
export async function saveSetRecording(
  transaction: SetTransaction,
  reference: SetReference,
  recording: SetRecording,
  nowMs: number,
) {
  const { programId, sessionId, activityId, setId } = reference;
  const session = await transaction.getFirstAsync<{ status: Status }>(
    "SELECT status FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    sessionId,
  );
  if (!session) throw new Error("Session not found");
  const terminal = session.status === "Done" || session.status === "Incomplete";
  const result = await transaction.runAsync(
    `UPDATE workout_sets SET actual_reps = ?, weight_value = ?, weight_unit = ?,
       feedback = ?, status = CASE WHEN ? THEN status ELSE ? END,
       start_ms = CASE WHEN ? THEN start_ms ELSE ? END,
       end_ms = CASE WHEN ? THEN end_ms ELSE ? END
     WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?`,
    recording.actualReps,
    recording.weight?.value ?? null,
    recording.weight?.unit ?? null,
    recording.feedback,
    Number(terminal),
    recording.status,
    Number(terminal),
    recording.startMs,
    Number(terminal),
    recording.endMs,
    programId,
    sessionId,
    activityId,
    setId,
  );
  if (result.changes === 0) throw new Error("Workout set not found");
  await transaction.runAsync(
    "UPDATE sessions SET last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
    nowMs,
    programId,
    sessionId,
  );
}

/** Reconcile a terminal session's edited reps without reopening the session. */
export async function reconcileTerminalSet(
  transaction: SetTransaction,
  reference: SetReference,
  actualReps: number | null,
  nowMs: number,
): Promise<boolean> {
  if (
    (actualReps !== null && !Number.isFinite(actualReps)) ||
    !Number.isFinite(nowMs)
  ) {
    throw new Error("Workout set values must be finite numbers.");
  }
  const current = await transaction.getFirstAsync<{
    sessionStatus: Status;
    sessionEndMs: number | null;
    setStatus: Status;
    actualReps: number | null;
    startMs: number | null;
    endMs: number | null;
  }>(
    `SELECT session.status AS sessionStatus, session.end_ms AS sessionEndMs,
       workout_set.status AS setStatus, workout_set.actual_reps AS actualReps,
       workout_set.start_ms AS startMs, workout_set.end_ms AS endMs
     FROM workout_sets workout_set
     JOIN sessions session ON session.program_id = workout_set.program_id
       AND session.id = workout_set.session_id
     WHERE workout_set.program_id = ? AND workout_set.session_id = ?
       AND workout_set.activity_id = ? AND workout_set.id = ?`,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  if (
    !current ||
    (current.sessionStatus !== "Done" && current.sessionStatus !== "Incomplete")
  )
    return false;
  const status = (actualReps ?? 0) > 0 ? "Done" : "Incomplete";
  if (Object.is(current.actualReps, actualReps) && current.setStatus === status)
    return false;
  const sessionEnd = current.sessionEndMs ?? nowMs;
  let startMs = current.startMs;
  let endMs = current.endMs;
  if (status === "Done" && current.setStatus !== "Done") {
    endMs = current.endMs ?? sessionEnd;
    startMs =
      current.startMs !== null && current.startMs <= endMs
        ? current.startMs
        : endMs;
  }
  await transaction.runAsync(
    `UPDATE workout_sets SET actual_reps = ?, status = ?, start_ms = ?, end_ms = ?
     WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?`,
    actualReps,
    status,
    startMs,
    endMs,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  await transaction.runAsync(
    `UPDATE sessions SET end_ms = COALESCE(end_ms, ?), last_activity_at_ms = ?, revision = revision + 1
     WHERE program_id = ? AND id = ?`,
    sessionEnd,
    nowMs,
    reference.programId,
    reference.sessionId,
  );
  return true;
}
