import type { Weight } from "@activity-log/ui/utils";

import type { SavedExercise } from "./exercises";
import type {
  SessionActivity,
  SessionDetail,
  SessionSet,
} from "./session-detail";
import type { SetReference } from "./sets";
import { plannedSetWeight } from "../domain/set-execution";

interface ContextReader {
  getFirstAsync<T>(sql: string, ...parameters: string[]): Promise<T | null>;
}

export interface SetExecutionContext {
  reference: SetReference;
  session: Omit<SessionDetail, "activities">;
  activity: Omit<
    SessionActivity,
    "exerciseName" | "exerciseDeleted" | "warmupSets" | "mainSets"
  > & {
    warmupSetCount: number;
    mainSetCount: number;
  };
  exercise: Omit<SavedExercise, "notes" | "primaryMuscles"> | null;
  set: SessionSet;
  firstMainSet: SessionSet | null;
  targetWeight: Weight | null;
  mainTargetWeight: Weight | null;
  hasTemplateHistory: boolean;
  isStartable: boolean;
  canComplete: boolean;
}

interface ContextRow {
  sessionName: string;
  lineageId: string | null;
  sessionStatus: SessionDetail["status"];
  deload: number;
  sessionStartMs: number | null;
  sessionEndMs: number | null;
  lastActivityAtMs: number | null;
  revision: number;
  exerciseId: string | null;
  reps: number | null;
  loadType: SessionActivity["loadType"];
  loadValue: number | null;
  restMinutes: number | null;
  exerciseName: string | null;
  exerciseDeleted: number | null;
  exerciseRevision: number | null;
  loadKind: SavedExercise["loadKind"];
  barbellId: string | null;
  oneRepMaxValue: number | null;
  oneRepMaxUnit: "lbs" | "kg" | null;
  firstPendingSetId: string | null;
  warmupSetCount: number;
  mainSetCount: number;
  setIndex: number;
  hasTemplateHistory: number;
  kind: SessionSet["kind"];
  position: number;
  setStatus: SessionSet["status"];
  feedback: SessionSet["feedback"];
  actualReps: number | null;
  weightValue: number | null;
  weightUnit: SessionSet["weightUnit"];
  startMs: number | null;
  endMs: number | null;
}

/** Read only the selected set/activity, scalar policy facts, and first main set. */
export async function getSetExecutionContext(
  reader: ContextReader,
  reference: SetReference,
): Promise<SetExecutionContext | null> {
  const { programId, sessionId, activityId, setId } = reference;
  const row = await reader.getFirstAsync<ContextRow>(
    `SELECT s.name AS sessionName, s.lineage_id AS lineageId, s.status AS sessionStatus,
       s.deload, s.start_ms AS sessionStartMs, s.end_ms AS sessionEndMs,
       s.last_activity_at_ms AS lastActivityAtMs, s.revision,
       a.exercise_id AS exerciseId, a.reps, a.load_type AS loadType,
       a.load_value AS loadValue, a.rest_minutes AS restMinutes,
       e.name AS exerciseName, e.deleted AS exerciseDeleted, e.revision AS exerciseRevision,
       e.load_kind AS loadKind, e.barbell_id AS barbellId,
       e.one_rep_max_value AS oneRepMaxValue, e.one_rep_max_unit AS oneRepMaxUnit,
       w.kind, w.position, w.status AS setStatus, w.feedback, w.actual_reps AS actualReps,
       w.weight_value AS weightValue, w.weight_unit AS weightUnit,
       w.start_ms AS startMs, w.end_ms AS endMs,
       (SELECT id FROM workout_sets WHERE program_id = a.program_id
         AND session_id = a.session_id AND activity_id = a.id AND status IN ('Planned', 'Ready')
         ORDER BY CASE kind WHEN 'Warmup' THEN 0 ELSE 1 END, position LIMIT 1) AS firstPendingSetId,
       (SELECT COUNT(*) FROM workout_sets WHERE program_id = a.program_id
         AND session_id = a.session_id AND activity_id = a.id AND kind = 'Warmup') AS warmupSetCount,
       (SELECT COUNT(*) FROM workout_sets WHERE program_id = a.program_id
         AND session_id = a.session_id AND activity_id = a.id AND kind = 'Main') AS mainSetCount,
       (SELECT COUNT(*) FROM workout_sets WHERE program_id = a.program_id
         AND session_id = a.session_id AND activity_id = a.id AND kind = w.kind
         AND position < w.position) AS setIndex,
       EXISTS(SELECT 1 FROM sessions previous WHERE previous.program_id = s.program_id
         AND previous.lineage_id = s.lineage_id AND previous.position < s.position) AS hasTemplateHistory
     FROM workout_sets w
     JOIN activities a ON a.program_id = w.program_id AND a.session_id = w.session_id AND a.id = w.activity_id
     JOIN sessions s ON s.program_id = a.program_id AND s.id = a.session_id
     LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE w.program_id = ? AND w.session_id = ? AND w.activity_id = ? AND w.id = ?`,
    programId,
    sessionId,
    activityId,
    setId,
  );
  if (!row) return null;
  const firstMainSet = await reader.getFirstAsync<SessionSet>(
    `SELECT id, kind, position, status, feedback, actual_reps AS actualReps,
       weight_value AS weightValue, weight_unit AS weightUnit, start_ms AS startMs, end_ms AS endMs
     FROM workout_sets WHERE program_id = ? AND session_id = ? AND activity_id = ? AND kind = 'Main'
     ORDER BY position LIMIT 1`,
    programId,
    sessionId,
    activityId,
  );
  const exercise: SetExecutionContext["exercise"] =
    row.exerciseId !== null && row.exerciseName !== null
      ? {
          id: row.exerciseId,
          name: row.exerciseName,
          deleted: row.exerciseDeleted === 1,
          revision: row.exerciseRevision ?? 0,
          loadKind: row.loadKind,
          barbellId: row.barbellId,
          oneRepMax:
            row.oneRepMaxValue !== null && row.oneRepMaxUnit !== null
              ? { value: row.oneRepMaxValue, unit: row.oneRepMaxUnit }
              : null,
        }
      : null;
  const activity: SetExecutionContext["activity"] = {
    id: activityId,
    exerciseId: row.exerciseId,
    reps: row.reps,
    loadType: row.loadType,
    loadValue: row.loadValue,
    restMinutes: row.restMinutes,
    warmupSetCount: row.warmupSetCount,
    mainSetCount: row.mainSetCount,
  };
  const set: SessionSet = {
    id: setId,
    kind: row.kind,
    position: row.position,
    status: row.setStatus,
    feedback: row.feedback,
    actualReps: row.actualReps,
    weightValue: row.weightValue,
    weightUnit: row.weightUnit,
    startMs: row.startMs,
    endMs: row.endMs,
  };
  const weight = (value: SessionSet): Weight | null =>
    value.weightValue !== null && value.weightUnit !== null
      ? { value: value.weightValue, unit: value.weightUnit }
      : null;
  return {
    reference: { ...reference },
    session: {
      id: sessionId,
      programId,
      name: row.sessionName,
      lineageId: row.lineageId,
      status: row.sessionStatus,
      deload: row.deload === 1,
      startMs: row.sessionStartMs,
      endMs: row.sessionEndMs,
      lastActivityAtMs: row.lastActivityAtMs,
      revision: row.revision,
    },
    activity,
    exercise,
    set,
    firstMainSet,
    targetWeight: plannedSetWeight(
      activity,
      { kind: set.kind, index: row.setIndex, weight: weight(set) },
      exercise?.oneRepMax ?? null,
    ),
    mainTargetWeight: firstMainSet
      ? plannedSetWeight(
          activity,
          { kind: "Main", index: 0, weight: weight(firstMainSet) },
          exercise?.oneRepMax ?? null,
        )
      : null,
    hasTemplateHistory: row.hasTemplateHistory === 1,
    isStartable:
      (row.sessionStatus === "Planned" || row.sessionStatus === "Ready") &&
      set.status === "Planned" &&
      row.firstPendingSetId === setId,
    canComplete:
      row.sessionStatus === "Ready" &&
      set.status === "Ready" &&
      (set.actualReps ?? 0) > 0,
  };
}
