import type { Db } from "../database/db";

type Status = "Planned" | "Ready" | "Done" | "Incomplete";

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

/** One planned exercise row: a main activity or one of its alternatives. */
export interface SessionActivityFields {
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

/** A main activity row with the alternatives the user may swap in for it. */
export interface SessionSupersetMember extends SessionActivityFields {
  alternatives: SessionActivityFields[];
}

/**
 * A main activity, with the superset members performed alternately with it.
 * Members are main activities themselves, stored right after their leader.
 */
export interface SessionActivity extends SessionSupersetMember {
  supersets: SessionSupersetMember[];
}

/** An activity's main rows in stored order: the leader, then its members. */
export function supersetRows<T extends { supersets: readonly unknown[] }>(
  activity: T,
): (T | T["supersets"][number])[] {
  return [activity, ...activity.supersets];
}

/** One set of a superset row, in performing order (see supersetSetOrder). */
export interface OrderedSet<
  T extends { warmupSets: readonly unknown[]; mainSets: readonly unknown[] },
> {
  row: T;
  set: T["warmupSets"][number] | T["mainSets"][number];
  kind: "Warmup" | "Main";
  /** The set's number among its row's sets of `kind`, from 0. */
  index: number;
}

/**
 * The order sets of a superset are performed in: each set number of each kind
 * alternates between the rows, warmups first. Without members this is just
 * the activity's warmup sets, then its main sets.
 */
export function supersetSetOrder<
  T extends { warmupSets: readonly unknown[]; mainSets: readonly unknown[] },
>(rows: readonly T[]): OrderedSet<T>[] {
  const result: OrderedSet<T>[] = [];
  for (const kind of ["Warmup", "Main"] as const) {
    const field = kind === "Warmup" ? "warmupSets" : "mainSets";
    const count = Math.max(0, ...rows.map((row) => row[field].length));
    for (let index = 0; index < count; index++)
      for (const row of rows) {
        const set = row[field][index];
        if (set !== undefined) result.push({ row, set, kind, index });
      }
  }
  return result;
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
  SessionActivityFields,
  "warmupSets" | "mainSets" | "exerciseDeleted"
> & {
  exerciseDeleted: number | null;
  parentActivityId: string | null;
  supersetActivityId: string | null;
};
type SetRow = SessionSet & { activityId: string };

/** Call in one read transaction so all three queries see the same snapshot. */
export function getSessionDetail(
  reader: Db,
  programId: string,
  sessionId: string,
): SessionDetail | null {
  const session = reader.getFirstSync<SessionRow>(
    `SELECT id, program_id AS programId, name, lineage_id AS lineageId, deload,
       status, start_ms AS startMs, end_ms AS endMs,
       last_activity_at_ms AS lastActivityAtMs, revision
     FROM sessions WHERE program_id = ? AND id = ?`,
    programId,
    sessionId,
  );
  if (!session) return null;
  const activityRows = reader.getAllSync<ActivityRow>(
    `SELECT a.id, a.parent_activity_id AS parentActivityId,
       a.superset_activity_id AS supersetActivityId, a.exercise_id AS exerciseId, e.name AS exerciseName,
       e.deleted AS exerciseDeleted, a.reps, a.load_type AS loadType,
       a.load_value AS loadValue, a.rest_minutes AS restMinutes
     FROM activities a LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND a.session_id = ?
     ORDER BY a.parent_activity_id IS NOT NULL, a.position`,
    programId,
    sessionId,
  );
  const setRows = reader.getAllSync<SetRow>(
    `SELECT activity_id AS activityId, id, kind, position, status, feedback,
       actual_reps AS actualReps, weight_value AS weightValue,
       weight_unit AS weightUnit, start_ms AS startMs, end_ms AS endMs
     FROM workout_sets WHERE program_id = ? AND session_id = ?
     ORDER BY activity_id, kind, position`,
    programId,
    sessionId,
  );
  const activities: SessionActivity[] = [];
  const byId = new Map<string, SessionActivityFields>();
  const leaders = new Map<string, SessionActivity>();
  const mains = new Map<string, SessionSupersetMember>();
  // Mains come first in stored order, so a member's leader and an
  // alternative's parent are already present.
  for (const {
    exerciseDeleted,
    parentActivityId,
    supersetActivityId,
    ...row
  } of activityRows) {
    const fields: SessionActivityFields = {
      ...row,
      exerciseDeleted: exerciseDeleted === 1,
      warmupSets: [],
      mainSets: [],
    };
    byId.set(fields.id, fields);
    if (parentActivityId === null && supersetActivityId !== null) {
      const leader = leaders.get(supersetActivityId);
      if (!leader)
        throw new Error("A superset member has no leading activity.");
      const member = { ...fields, alternatives: [] };
      byId.set(member.id, member);
      mains.set(member.id, member);
      leader.supersets.push(member);
    } else if (parentActivityId === null) {
      const main = { ...fields, alternatives: [], supersets: [] };
      byId.set(main.id, main);
      mains.set(main.id, main);
      leaders.set(main.id, main);
      activities.push(main);
    } else {
      const parent = mains.get(parentActivityId);
      if (!parent) throw new Error("An alternative has no owning activity.");
      parent.alternatives.push(fields);
    }
  }
  for (const { activityId, ...set } of setRows) {
    const activity = byId.get(activityId);
    if (!activity) throw new Error("A workout set has no owning activity.");
    (set.kind === "Main" ? activity.mainSets : activity.warmupSets).push(set);
  }
  return { ...session, deload: session.deload === 1, activities };
}
