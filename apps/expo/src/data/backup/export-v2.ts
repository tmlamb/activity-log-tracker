import type { Db } from "../database/db";
import type { PortableDataV2 } from "./portable-v2";

type Unit = "lbs" | "kg";
type Status = "Planned" | "Ready" | "Done" | "Incomplete";
type LoadKind = "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;

function weight(value: number | null, unit: Unit | null) {
  if (value === null && unit === null) return null;
  if (value === null || unit === null)
    throw new Error("A saved weight is incomplete.");
  return { value, unit };
}

/** Read ordered rows inside a single snapshot; reconstruct only after it closes. */
export function readPortableFactsV2(reader: Db) {
  const programs = reader.getAllSync<{ id: string; name: string }>(
    "SELECT id, name FROM programs ORDER BY position",
  );
  const lineages = reader.getAllSync<{ programId: string; id: string }>(
    "SELECT program_id AS programId, id FROM session_lineages ORDER BY program_id, id",
  );
  const sessions = reader.getAllSync<{
    programId: string;
    id: string;
    lineageId: string | null;
    name: string;
    status: Status;
    deload: number;
    startMs: number | null;
    endMs: number | null;
    lastActivityAtMs: number | null;
  }>(
    "SELECT program_id AS programId, id, lineage_id AS lineageId, name, status, deload, start_ms AS startMs, end_ms AS endMs, last_activity_at_ms AS lastActivityAtMs FROM sessions ORDER BY program_id, position",
  );
  const activities = reader.getAllSync<{
    programId: string;
    sessionId: string;
    id: string;
    exerciseId: string | null;
    reps: number | null;
    loadType: "PERCENT" | "RPE" | null;
    loadValue: number | null;
    restMinutes: number | null;
  }>(
    "SELECT program_id AS programId, session_id AS sessionId, id, exercise_id AS exerciseId, reps, load_type AS loadType, load_value AS loadValue, rest_minutes AS restMinutes FROM activities ORDER BY program_id, session_id, position",
  );
  const sets = reader.getAllSync<{
    programId: string;
    sessionId: string;
    activityId: string;
    id: string;
    kind: "Warmup" | "Main";
    position: number;
    status: Status;
    feedback: "Easy" | "Neutral" | "Hard";
    actualReps: number | null;
    value: number | null;
    unit: Unit | null;
    startMs: number | null;
    endMs: number | null;
  }>(
    "SELECT program_id AS programId, session_id AS sessionId, activity_id AS activityId, id, kind, position, status, feedback, actual_reps AS actualReps, weight_value AS value, weight_unit AS unit, start_ms AS startMs, end_ms AS endMs FROM workout_sets ORDER BY program_id, session_id, activity_id, kind, position",
  );
  const exercises = reader.getAllSync<{
    id: string;
    name: string;
    loadKind: LoadKind;
    barbellId: string | null;
    maxValue: number | null;
    maxUnit: Unit | null;
    notes: string | null;
    deleted: number;
  }>(
    "SELECT id, name, load_kind AS loadKind, barbell_id AS barbellId, one_rep_max_value AS maxValue, one_rep_max_unit AS maxUnit, notes, deleted FROM exercises ORDER BY position",
  );
  const presets = reader.getAllSync<{
    id: string;
    name: string;
    loadKind: LoadKind;
  }>(
    "SELECT id, name, load_kind AS loadKind FROM exercise_presets ORDER BY position",
  );
  const exerciseMuscles = reader.getAllSync<{
    ownerId: string;
    name: string;
  }>(
    "SELECT m.exercise_id AS ownerId, l.name FROM exercise_muscles m JOIN muscle_labels l ON l.id = m.muscle_id ORDER BY m.exercise_id, m.position",
  );
  const presetMuscles = reader.getAllSync<{
    ownerId: string;
    name: string;
  }>(
    "SELECT m.preset_id AS ownerId, l.name FROM preset_muscles m JOIN muscle_labels l ON l.id = m.muscle_id ORDER BY m.preset_id, m.position",
  );
  const muscleGroups = reader.getAllSync<{ name: string }>(
    "SELECT l.name FROM muscle_catalog m JOIN muscle_labels l ON l.id = m.muscle_id ORDER BY m.position",
  );
  const barbells = reader.getAllSync<{
    id: string;
    value: number;
    unit: Unit;
  }>("SELECT id, value, unit FROM barbells ORDER BY position");
  const plates = reader.getAllSync<{
    id: string;
    value: number;
    unit: Unit;
    quantity: number;
  }>("SELECT id, value, unit, quantity FROM plates ORDER BY position");

  return {
    programs,
    lineages,
    sessions,
    activities,
    sets,
    exercises,
    presets,
    exerciseMuscles,
    presetMuscles,
    muscleGroups,
    barbells,
    plates,
  };
}

/** Full reconstruction is reserved for explicit backup. */
export function buildPortableDataV2(
  facts: Awaited<ReturnType<typeof readPortableFactsV2>>,
): PortableDataV2 {
  const {
    programs,
    lineages,
    sessions,
    activities,
    sets,
    exercises,
    presets,
    exerciseMuscles,
    presetMuscles,
    muscleGroups,
    barbells,
    plates,
  } = facts;
  const key = (...parts: string[]) => JSON.stringify(parts);
  const programMap = new Map(
    programs.map((program) => [
      program.id,
      {
        ...program,
        lineages: [] as string[],
        sessions: [] as PortableDataV2["programs"][number]["sessions"],
      },
    ]),
  );
  for (const lineage of lineages) {
    const program = programMap.get(lineage.programId);
    if (!program) throw new Error("A lineage has no owning program.");
    program.lineages.push(lineage.id);
  }
  const sessionMap = new Map<
    string,
    PortableDataV2["programs"][number]["sessions"][number]
  >();
  for (const { programId, deload, ...session } of sessions) {
    const program = programMap.get(programId);
    if (!program) throw new Error("A session has no owning program.");
    const item = { ...session, deload: deload === 1, activities: [] };
    program.sessions.push(item);
    sessionMap.set(key(programId, session.id), item);
  }
  type PortableActivity =
    PortableDataV2["programs"][number]["sessions"][number]["activities"][number];
  const activityMap = new Map<string, PortableActivity>();
  for (const {
    programId,
    sessionId,
    loadType,
    loadValue,
    ...activity
  } of activities) {
    const session = sessionMap.get(key(programId, sessionId));
    if (!session) throw new Error("An activity has no owning session.");
    if ((loadType === null) !== (loadValue === null))
      throw new Error("A saved load is incomplete.");
    const item: PortableActivity = {
      ...activity,
      load:
        loadType !== null && loadValue !== null
          ? { type: loadType, value: loadValue }
          : null,
      warmupSets: [],
      mainSets: [],
    };
    session.activities.push(item);
    activityMap.set(key(programId, sessionId, activity.id), item);
  }
  for (const {
    programId,
    sessionId,
    activityId,
    kind,
    position: _position,
    value,
    unit,
    ...set
  } of sets) {
    const activity = activityMap.get(key(programId, sessionId, activityId));
    if (!activity) throw new Error("A set has no owning activity.");
    (kind === "Main" ? activity.mainSets : activity.warmupSets).push({
      ...set,
      weight: weight(value, unit),
    });
  }
  const memberships = (rows: { ownerId: string; name: string }[]) => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const labels = map.get(row.ownerId) ?? [];
      labels.push(row.name);
      map.set(row.ownerId, labels);
    }
    return map;
  };
  const exerciseLabels = memberships(exerciseMuscles);
  const presetLabels = memberships(presetMuscles);
  return {
    programs: [...programMap.values()],
    exercises: exercises.map(({ maxValue, maxUnit, deleted, ...exercise }) => ({
      ...exercise,
      deleted: deleted === 1,
      oneRepMax: weight(maxValue, maxUnit),
      primaryMuscles: exerciseLabels.get(exercise.id) ?? [],
    })),
    presets: presets.map((preset) => ({
      ...preset,
      primaryMuscles: presetLabels.get(preset.id) ?? [],
    })),
    equipment: { barbells, plates },
    muscleGroups: muscleGroups.map(({ name }) => name),
  };
}

/** Convenience for callers already managing their own snapshot lifetime. */
export function readPortableDataV2(reader: Db): PortableDataV2 {
  return buildPortableDataV2(readPortableFactsV2(reader));
}
