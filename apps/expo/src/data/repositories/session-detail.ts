type Status = "Planned" | "Ready" | "Done" | "Incomplete";

interface SessionReader {
  getFirstAsync<T>(sql: string, ...parameters: string[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...parameters: string[]): Promise<T[]>;
}

export interface SessionSet {
  id: string;
  kind: "Warmup" | "Main";
  position: number;
  status: Status;
  feedback: "Easy" | "Neutral" | "Hard";
  actualReps: number | null;
  weightValue: number | null;
  weightUnit: "lbs" | "kg" | null;
  startMs: number | null;
  endMs: number | null;
}

export interface SessionActivity {
  id: string;
  exerciseId: string | null;
  exerciseName: string | null;
  exerciseDeleted: boolean;
  reps: number | null;
  loadType: "PERCENT" | "RPE" | null;
  loadValue: number | null;
  restMinutes: number | null;
  warmupSets: SessionSet[];
  mainSets: SessionSet[];
}

export interface SessionDetail {
  id: string;
  programId: string;
  name: string;
  lineageId: string | null;
  deload: boolean;
  status: Status;
  startMs: number | null;
  endMs: number | null;
  lastActivityAtMs: number | null;
  revision: number;
  activities: SessionActivity[];
}

type SessionRow = Omit<SessionDetail, "activities" | "deload"> & {
  deload: number;
};
type ActivityRow = Omit<
  SessionActivity,
  "warmupSets" | "mainSets" | "exerciseDeleted"
> & { exerciseDeleted: number | null };
type SetRow = SessionSet & { activityId: string };

/** Call in one read transaction so all three queries see the same snapshot. */
export async function getSessionDetail(
  reader: SessionReader,
  programId: string,
  sessionId: string,
): Promise<SessionDetail | null> {
  const session = await reader.getFirstAsync<SessionRow>(
    `SELECT id, program_id AS programId, name, lineage_id AS lineageId, deload,
       status, start_ms AS startMs, end_ms AS endMs,
       last_activity_at_ms AS lastActivityAtMs, revision
     FROM sessions WHERE program_id = ? AND id = ?`,
    programId,
    sessionId,
  );
  if (!session) return null;
  const activityRows = await reader.getAllAsync<ActivityRow>(
    `SELECT a.id, a.exercise_id AS exerciseId, e.name AS exerciseName,
       e.deleted AS exerciseDeleted, a.reps, a.load_type AS loadType,
       a.load_value AS loadValue, a.rest_minutes AS restMinutes
     FROM activities a LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND a.session_id = ? ORDER BY a.position`,
    programId,
    sessionId,
  );
  const setRows = await reader.getAllAsync<SetRow>(
    `SELECT activity_id AS activityId, id, kind, position, status, feedback,
       actual_reps AS actualReps, weight_value AS weightValue,
       weight_unit AS weightUnit, start_ms AS startMs, end_ms AS endMs
     FROM workout_sets WHERE program_id = ? AND session_id = ?
     ORDER BY activity_id, kind, position`,
    programId,
    sessionId,
  );
  const activities = activityRows.map(({ exerciseDeleted, ...activity }) => ({
    ...activity,
    exerciseDeleted: exerciseDeleted === 1,
    warmupSets: [] as SessionSet[],
    mainSets: [] as SessionSet[],
  }));
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  for (const { activityId, ...set } of setRows) {
    const activity = byId.get(activityId);
    if (!activity) throw new Error("A workout set has no owning activity.");
    (set.kind === "Main" ? activity.mainSets : activity.warmupSets).push(set);
  }
  return { ...session, deload: session.deload === 1, activities };
}
