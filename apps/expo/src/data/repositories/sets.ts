import type { Db } from "../database/db";
import type { SetKind } from "./session-detail";
import { SET_KINDS } from "./session-detail";

type Status = "Planned" | "Ready" | "Done" | "Incomplete";
type Feedback = "Easy" | "Neutral" | "Hard";
type Unit = "lbs" | "kg";

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

export interface SetRecordingPatch {
  actualReps?: number | null;
  weight?: { value: number; unit: Unit } | null;
  feedback?: Feedback;
}

interface CurrentSet {
  sessionStatus: Status;
  setStatus: Status;
  kind: SetKind;
  position: number;
  activityPosition: number;
  startMs: number | null;
}

/**
 * The sets performed together with one activity's, in order. An activity
 * leading a superset and its members share one sequence that alternates
 * between them for each set number, warmups first and drop sets last; any
 * other activity (an
 * alternative included) is a sequence of its own. Selects from `w` joined to
 * its activity `a`; takes program, session, program, session and activity IDs.
 */
const SET_SEQUENCE_FROM = `workout_sets w JOIN activities a
    ON a.program_id = w.program_id AND a.session_id = w.session_id AND a.id = w.activity_id
  WHERE w.program_id = ? AND w.session_id = ?
    AND COALESCE(a.superset_activity_id, a.id) = (
      SELECT COALESCE(superset_activity_id, id) FROM activities
      WHERE program_id = ? AND session_id = ? AND id = ?)`;
/**
 * SQL ranking a set's kind (from `column`) in performing order: warmups, then
 * main sets, then drop sets. Matches kindRank.
 */
export function kindRankSql(column: string) {
  return `CASE ${column} WHEN 'Warmup' THEN 0 WHEN 'Main' THEN 1 ELSE 2 END`;
}
/** A set kind's rank in performing order (see kindRankSql). */
const kindRank = (kind: SetKind) => SET_KINDS.indexOf(kind);
/** The ordering key of a set within its sequence (see SET_SEQUENCE_FROM). */
const SET_SEQUENCE_KEY = `(${kindRankSql("w.kind")}, w.position, a.position)`;
const SET_SEQUENCE_ORDER = `${kindRankSql("w.kind")}, w.position, a.position`;

function sequenceParameters(reference: SetReference) {
  return [
    reference.programId,
    reference.sessionId,
    reference.programId,
    reference.sessionId,
    reference.activityId,
  ];
}

function getCurrentSet(transaction: Db, reference: SetReference): CurrentSet {
  const current = transaction.getFirstSync<CurrentSet>(
    `SELECT session.status AS sessionStatus, workout_set.status AS setStatus,
       workout_set.kind, workout_set.position, activity.position AS activityPosition,
       workout_set.start_ms AS startMs
     FROM workout_sets workout_set
     JOIN sessions session ON session.program_id = workout_set.program_id
       AND session.id = workout_set.session_id
     JOIN activities activity ON activity.program_id = workout_set.program_id
       AND activity.session_id = workout_set.session_id AND activity.id = workout_set.activity_id
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

/** Apply only explicitly edited fields; never write stale status or timestamps. */
export function patchSetRecording(
  transaction: Db,
  reference: SetReference,
  patch: SetRecordingPatch,
  nowMs: number,
): boolean {
  if (
    !Number.isFinite(nowMs) ||
    (patch.actualReps !== undefined &&
      patch.actualReps !== null &&
      !Number.isFinite(patch.actualReps)) ||
    (patch.weight != null && !Number.isFinite(patch.weight.value))
  )
    throw new Error("Workout set values must be finite numbers.");
  const current = transaction.getFirstSync<{
    actualReps: number | null;
    weightValue: number | null;
    weightUnit: Unit | null;
    feedback: Feedback;
  }>(
    `SELECT actual_reps AS actualReps, weight_value AS weightValue, weight_unit AS weightUnit, feedback
     FROM workout_sets WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?`,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  if (!current) throw new Error("Workout set not found");
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (
    patch.actualReps !== undefined &&
    patch.actualReps !== current.actualReps
  ) {
    fields.push("actual_reps = ?");
    values.push(patch.actualReps);
  }
  if (
    patch.weight !== undefined &&
    (current.weightValue !== (patch.weight?.value ?? null) ||
      current.weightUnit !== (patch.weight?.unit ?? null))
  ) {
    fields.push("weight_value = ?", "weight_unit = ?");
    values.push(patch.weight?.value ?? null, patch.weight?.unit ?? null);
  }
  if (patch.feedback !== undefined && patch.feedback !== current.feedback) {
    fields.push("feedback = ?");
    values.push(patch.feedback);
  }
  if (!fields.length) return false;
  transaction.runSync(
    `UPDATE workout_sets SET ${fields.join(", ")} WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?`,
    ...values,
    reference.programId,
    reference.sessionId,
    reference.activityId,
    reference.setId,
  );
  transaction.runSync(
    "UPDATE sessions SET last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
    nowMs,
    reference.programId,
    reference.sessionId,
  );
  return true;
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
export function startSet(
  transaction: Db,
  reference: SetReference,
  measurements: SetMeasurements,
  nowMs: number,
) {
  validateMeasurements(measurements, nowMs);
  const current = getCurrentSet(transaction, reference);
  if (
    (current.sessionStatus !== "Planned" &&
      current.sessionStatus !== "Ready") ||
    current.setStatus !== "Planned"
  ) {
    throw new Error("Workout set cannot be started.");
  }
  const firstPending = transaction.getFirstSync<{
    id: string;
    activityId: string;
  }>(
    `SELECT w.id, w.activity_id AS activityId FROM ${SET_SEQUENCE_FROM}
       AND w.status IN ('Planned', 'Ready')
     ORDER BY ${SET_SEQUENCE_ORDER} LIMIT 1`,
    ...sequenceParameters(reference),
  );
  if (
    firstPending?.id !== reference.setId ||
    firstPending.activityId !== reference.activityId
  ) {
    throw new Error("Only the first pending set can be started.");
  }
  const result = transaction.runSync(
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
  transaction.runSync(
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

/**
 * Complete a ready set and start the immediately following planned set, which
 * in a superset belongs to the next exercise.
 */
export function completeSetAndAdvance(
  transaction: Db,
  reference: SetReference,
  measurements: SetMeasurements,
  nowMs: number,
): string | null {
  validateMeasurements(measurements, nowMs);
  const current = getCurrentSet(transaction, reference);
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
  const result = transaction.runSync(
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
  const next = transaction.getFirstSync<{
    id: string;
    activityId: string;
    status: Status;
  }>(
    `SELECT w.id, w.activity_id AS activityId, w.status FROM ${SET_SEQUENCE_FROM}
       AND ${SET_SEQUENCE_KEY} > (?, ?, ?)
     ORDER BY ${SET_SEQUENCE_ORDER} LIMIT 1`,
    ...sequenceParameters(reference),
    kindRank(current.kind),
    current.position,
    current.activityPosition,
  );
  let nextId: string | null = null;
  if (next?.status === "Planned") {
    const advanced = transaction.runSync(
      `UPDATE workout_sets SET start_ms = ?, status = 'Ready'
       WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ? AND status = 'Planned'`,
      nowMs,
      reference.programId,
      reference.sessionId,
      next.activityId,
      next.id,
    );
    if (advanced.changes !== 1)
      throw new Error("The next workout set could not be started.");
    nextId = next.id;
  }
  transaction.runSync(
    "UPDATE sessions SET last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
    nowMs,
    reference.programId,
    reference.sessionId,
  );
  return nextId;
}

/**
 * Return a done or running set to not started so it can be performed again,
 * along with any later sets in its activity (or superset) that are done or in
 * progress.
 * Recorded reps, weight and difficulty are kept in case the set is repeated
 * the same way. Only an in-progress session's sets can be reset.
 */
export function resetSet(
  transaction: Db,
  reference: SetReference,
  nowMs: number,
) {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid reset time.");
  const current = getCurrentSet(transaction, reference);
  if (
    current.sessionStatus !== "Ready" ||
    (current.setStatus !== "Done" &&
      (current.setStatus !== "Ready" || current.startMs === null))
  )
    throw new Error("Workout set cannot be reset.");
  transaction.runSync(
    `UPDATE workout_sets SET status = 'Planned', start_ms = NULL, end_ms = NULL
     WHERE status IN ('Done', 'Ready') AND rowid IN (
       SELECT w.rowid FROM ${SET_SEQUENCE_FROM}
         AND ${SET_SEQUENCE_KEY} >= (?, ?, ?))`,
    ...sequenceParameters(reference),
    kindRank(current.kind),
    current.position,
    current.activityPosition,
  );
  transaction.runSync(
    "UPDATE sessions SET last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
    nowMs,
    reference.programId,
    reference.sessionId,
  );
}

/**
 * Persist one set and its session's activity timestamp in one writer
 * transaction. Terminal session status and set timestamps cannot be reopened
 * by a stale recording submission.
 */
export function saveSetRecording(
  transaction: Db,
  reference: SetReference,
  recording: SetRecording,
  nowMs: number,
) {
  const { programId, sessionId, activityId, setId } = reference;
  const session = transaction.getFirstSync<{ status: Status }>(
    "SELECT status FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    sessionId,
  );
  if (!session) throw new Error("Session not found");
  const terminal = session.status === "Done" || session.status === "Incomplete";
  const result = transaction.runSync(
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
  transaction.runSync(
    "UPDATE sessions SET last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
    nowMs,
    programId,
    sessionId,
  );
}

/** Reconcile a terminal session's edited reps without reopening the session. */
export function reconcileTerminalSet(
  transaction: Db,
  reference: SetReference,
  actualReps: number | null,
  nowMs: number,
): boolean {
  if (
    (actualReps !== null && !Number.isFinite(actualReps)) ||
    !Number.isFinite(nowMs)
  ) {
    throw new Error("Workout set values must be finite numbers.");
  }
  const current = transaction.getFirstSync<{
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
  transaction.runSync(
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
  transaction.runSync(
    `UPDATE sessions SET end_ms = COALESCE(end_ms, ?), last_activity_at_ms = ?, revision = revision + 1
     WHERE program_id = ? AND id = ?`,
    sessionEnd,
    nowMs,
    reference.programId,
    reference.sessionId,
  );
  return true;
}
