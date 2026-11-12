import { normalizeSingleLineText } from "@activity-log/ui/utils";

import type { SessionActivity, SessionSet } from "./session-detail";

interface DraftTransaction {
  getFirstAsync<T>(sql: string, ...parameters: (string | number | null)[]): Promise<T | null>;
  runAsync(sql: string, ...parameters: (string | number | null)[]): Promise<{ changes: number }>;
}

export type DraftSet = Omit<SessionSet, "kind" | "position">;
export type DraftActivity = Omit<SessionActivity, "exerciseName" | "exerciseDeleted" | "warmupSets" | "mainSets"> & {
  warmupSets: DraftSet[];
  mainSets: DraftSet[];
};

export interface SessionDraft {
  name: string;
  deload: boolean;
  startMs: number | null;
  endMs: number | null;
  activities: DraftActivity[];
}

export interface TemplateSource {
  sessionId: string;
  baseRevision: number;
  /** A freshly generated lineage ID used only when the source has none. */
  newLineageId: string;
}

interface CurrentSession {
  revision: number;
  status: "Planned" | "Ready" | "Done" | "Incomplete";
  endMs: number | null;
  lineageId: string | null;
}

function validateDraft(draft: SessionDraft) {
  const activityIds = new Set<string>();
  for (const activity of draft.activities) {
    if (!activity.id.trim() || activityIds.has(activity.id)) throw new Error("Invalid or duplicate activity ID.");
    activityIds.add(activity.id);
    const setIds = new Set<string>();
    for (const set of [...activity.warmupSets, ...activity.mainSets]) {
      if (!set.id.trim() || setIds.has(set.id)) throw new Error("Invalid or duplicate workout set ID.");
      setIds.add(set.id);
      if ((set.weightValue === null) !== (set.weightUnit === null)) throw new Error("A workout weight requires a value and unit.");
      for (const value of [set.actualReps, set.weightValue, set.startMs, set.endMs]) {
        if (value !== null && !Number.isFinite(value)) throw new Error("Workout values must be finite numbers.");
      }
    }
    if ((activity.loadValue === null) !== (activity.loadType === null)) throw new Error("A workout load requires a value and type.");
    for (const value of [activity.reps, activity.loadValue, activity.restMinutes]) {
      if (value !== null && !Number.isFinite(value)) throw new Error("Workout values must be finite numbers.");
    }
  }
  for (const value of [draft.startMs, draft.endMs]) {
    if (value !== null && !Number.isFinite(value)) throw new Error("Workout dates must be finite numbers.");
  }
}

async function insertActivities(transaction: DraftTransaction, programId: string, sessionId: string, activities: DraftActivity[]) {
  for (const [position, activity] of activities.entries()) {
    await transaction.runAsync(
      `INSERT INTO activities(program_id, session_id, id, exercise_id, position, reps, load_type, load_value, rest_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      programId, sessionId, activity.id, activity.exerciseId, position, activity.reps, activity.loadType, activity.loadValue, activity.restMinutes,
    );
    for (const [kind, sets] of [["Warmup", activity.warmupSets], ["Main", activity.mainSets]] as const) {
      for (const [setPosition, set] of sets.entries()) {
        await transaction.runAsync(
          `INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, weight_value, weight_unit, start_ms, end_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          programId, sessionId, activity.id, set.id, kind, setPosition, set.status, set.feedback, set.actualReps, set.weightValue, set.weightUnit, set.startMs, set.endMs,
        );
      }
    }
  }
}

/** Create a planned session and establish its lineage atomically. */
export async function createPlannedSession(
  transaction: DraftTransaction,
  programId: string,
  sessionId: string,
  draft: SessionDraft,
  template: TemplateSource | null,
  nowMs: number,
) {
  validateDraft(draft);
  let lineageId: string | null = null;
  if (template) {
    const source = await transaction.getFirstAsync<CurrentSession>(
      "SELECT revision, status, end_ms AS endMs, lineage_id AS lineageId FROM sessions WHERE program_id = ? AND id = ?",
      programId, template.sessionId,
    );
    if (!source) throw new Error("Template session not found.");
    if (source.revision !== template.baseRevision) throw new Error("The template session changed. Reload before saving.");
    lineageId = source.lineageId ?? template.newLineageId;
    if (source.lineageId === null) {
      await transaction.runAsync("INSERT INTO session_lineages(program_id, id) VALUES (?, ?)", programId, lineageId);
      await transaction.runAsync(
        "UPDATE sessions SET lineage_id = ?, last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?",
        lineageId, nowMs, programId, template.sessionId,
      );
    }
  }
  await transaction.runAsync(
    `INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, last_activity_at_ms)
     VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM sessions WHERE program_id = ?), 'Planned', ?, ?)`,
    programId, sessionId, lineageId, normalizeSingleLineText(draft.name), programId, Number(draft.deload), nowMs,
  );
  await insertActivities(transaction, programId, sessionId, draft.activities);
}

/** Save one session's draft without replacing newer or finalized workout data. */
export async function saveSessionDraft(
  transaction: DraftTransaction,
  programId: string,
  sessionId: string,
  baseRevision: number,
  draft: SessionDraft,
  renameLineage: boolean,
  nowMs: number,
) {
  validateDraft(draft);
  const current = await transaction.getFirstAsync<CurrentSession>(
    "SELECT revision, status, end_ms AS endMs, lineage_id AS lineageId FROM sessions WHERE program_id = ? AND id = ?",
    programId, sessionId,
  );
  if (!current) throw new Error("Session not found.");
  if (current.revision !== baseRevision) throw new Error("The session changed. Reload before saving.");
  const terminal = current.status === "Done" || current.status === "Incomplete";
  const hasNonterminalSets = draft.activities.some((activity) => [...activity.warmupSets, ...activity.mainSets].some((set) => set.status === "Planned" || set.status === "Ready"));
  const nextName = normalizeSingleLineText(draft.name);
  if (renameLineage) {
    await transaction.runAsync(
      `UPDATE sessions SET name = ?, revision = revision + 1
       WHERE program_id = ? AND COALESCE(lineage_id, id) = ? AND id <> ?`,
      nextName, programId, current.lineageId ?? sessionId, sessionId,
    );
  }
  await transaction.runAsync(
    `UPDATE sessions SET name = ?, deload = ?, start_ms = ?, end_ms = ?,
       last_activity_at_ms = ?, revision = revision + 1 WHERE program_id = ? AND id = ?`,
    nextName, Number(draft.deload), draft.startMs,
    terminal ? (draft.endMs ?? current.endMs ?? nowMs) : draft.endMs,
    nowMs, programId, sessionId,
  );
  if (!terminal || !hasNonterminalSets) {
    await transaction.runAsync("DELETE FROM activities WHERE program_id = ? AND session_id = ?", programId, sessionId);
    await insertActivities(transaction, programId, sessionId, draft.activities);
  }
}
