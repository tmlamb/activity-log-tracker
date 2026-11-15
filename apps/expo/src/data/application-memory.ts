import { addDays, startOfDay } from "date-fns";

import type { Equipment } from "@activity-log/ui/utils";
import { weekAndDayNumbersFromStart } from "@activity-log/ui/utils";

import type { PortableDataV2 } from "./backup/portable-v2";
import type { DeloadCandidateFacts } from "./repositories/deload-candidate";
import type { ExerciseSeriesFacts } from "./repositories/exercise-series";
import type { SavedExercise } from "./repositories/exercises";
import type {
  PlanningWeightActivity,
  PlanningWeightHint,
  PlanningWeightSource,
} from "./repositories/planning-weights";
import type { ProgramInsightFacts } from "./repositories/program-insights";
import type { SessionDetail, SessionSet } from "./repositories/session-detail";
import type { SessionEditorSeed } from "./repositories/session-editor";
import type { SetExecutionContext } from "./repositories/set-context";
import type {
  SetMeasurements,
  SetRecordingPatch,
  SetReference,
} from "./repositories/sets";
import type { TemplateChoice } from "./repositories/templates";
import { buildPortableDataV2, readPortableFactsV2 } from "./backup/export-v2";
import { buildProgramOverview } from "./domain/program-timeline";
import { plannedSetWeight } from "./domain/set-execution";

interface MemoryReader {
  getAllAsync<T>(sql: string): Promise<T[]>;
}

type Session = PortableDataV2["programs"][number]["sessions"][number];
type Activity = Session["activities"][number];
type WorkoutSet = Activity["mainSets"][number];
interface IndexedSet {
  set: WorkoutSet;
  position: number | undefined;
}

/** Composite identities are necessary: child IDs are only unique within their parent. */
export function memoryKey(...parts: string[]) {
  return JSON.stringify(parts);
}

/** Call inside one read transaction; all facts and revisions share its snapshot. */
export async function readApplicationMemoryFacts(reader: MemoryReader) {
  const facts = await readPortableFactsV2(reader);
  const sessionRevisions = await reader.getAllAsync<{
    programId: string;
    id: string;
    revision: number;
  }>("SELECT program_id AS programId, id, revision FROM sessions");
  const exerciseRevisions = await reader.getAllAsync<{
    id: string;
    revision: number;
  }>("SELECT id, revision FROM exercises");
  return { facts, sessionRevisions, exerciseRevisions };
}

/** Reconstruct once, after releasing the SQLite snapshot. */
export function buildApplicationMemory(
  source: Awaited<ReturnType<typeof readApplicationMemoryFacts>>,
  generation: number,
) {
  const data = buildPortableDataV2(source.facts);
  const programs = new Map(
    data.programs.map((program) => [program.id, program]),
  );
  const exercises = new Map(
    data.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const sessions = new Map<string, Session>();
  const activities = new Map<string, Activity>();
  const setsByActivity = new WeakMap<Activity, Map<string, IndexedSet>>();
  for (const program of data.programs) {
    for (const session of program.sessions) {
      sessions.set(memoryKey(program.id, session.id), session);
      for (const activity of session.activities) {
        activities.set(
          memoryKey(program.id, session.id, activity.id),
          activity,
        );
        const sets = new Map<string, IndexedSet>();
        for (const set of [...activity.warmupSets, ...activity.mainSets])
          sets.set(set.id, { set, position: undefined });
        setsByActivity.set(activity, sets);
      }
    }
  }
  for (const { programId, sessionId, activityId, id, position } of source.facts
    .sets) {
    const activity = activities.get(
      memoryKey(programId, sessionId, activityId),
    );
    const entry = activity && setsByActivity.get(activity)?.get(id);
    if (!entry) throw new Error("The workout set is missing from memory.");
    entry.position = position;
  }
  return {
    generation,
    data,
    programs,
    exercises,
    sessions,
    activities,
    setsByActivity,
    sessionRevisions: new Map(
      source.sessionRevisions.map(({ programId, id, revision }) => [
        memoryKey(programId, id),
        revision,
      ]),
    ),
    exerciseRevisions: new Map(
      source.exerciseRevisions.map(({ id, revision }) => [id, revision]),
    ),
  };
}

export type ApplicationMemory = ReturnType<typeof buildApplicationMemory>;

export function getMemoryPrograms(memory: ApplicationMemory) {
  return memory.data.programs.map((program) => ({
    id: program.id,
    name: program.name,
    sessionCount: program.sessions.length,
  }));
}

export function getMemoryProgramOverview(
  memory: ApplicationMemory,
  programId: string,
  nowMs: number,
) {
  const program = memory.programs.get(programId);
  if (!program) return null;
  let earliestStartMs: number | null = null;
  for (const session of program.sessions)
    if (
      session.startMs !== null &&
      (earliestStartMs === null || session.startMs < earliestStartMs)
    )
      earliestStartMs = session.startMs;
  return buildProgramOverview(
    { programId, sessionCount: program.sessions.length, earliestStartMs },
    program.sessions.map((session) => ({
      status: session.status,
      startMs: session.status === "Planned" ? null : session.startMs,
      count: 1,
    })),
    nowMs,
  );
}

export function getMemoryExercise(
  memory: ApplicationMemory,
  id: string,
): SavedExercise | null {
  const exercise = memory.exercises.get(id);
  if (!exercise) return null;
  const revision = memory.exerciseRevisions.get(id);
  if (revision === undefined)
    throw new Error("The exercise revision is missing.");
  return { ...exercise, revision };
}

export function getMemoryProgramInsightFacts(
  memory: ApplicationMemory,
  programId: string,
): ProgramInsightFacts | null {
  const program = memory.programs.get(programId);
  if (!program) return null;
  const sessions = program.sessions.map(({ id, status, startMs }) => ({
    id,
    status,
    startMs,
  }));
  const exerciseIds = new Set<string>();
  const sets: ProgramInsightFacts["sets"] = [];
  for (const session of program.sessions)
    for (const activity of session.activities) {
      if (activity.exerciseId) exerciseIds.add(activity.exerciseId);
      const exercise = activity.exerciseId
        ? memory.exercises.get(activity.exerciseId)
        : undefined;
      for (const set of activity.mainSets)
        sets.push({
          sessionId: session.id,
          activityId: activity.id,
          exerciseId: activity.exerciseId,
          exerciseName: exercise?.name ?? null,
          loadKind: exercise?.loadKind ?? null,
          maxValue: exercise?.oneRepMax?.value ?? null,
          maxUnit: exercise?.oneRepMax?.unit ?? null,
          plannedReps: activity.reps,
          loadType: activity.load?.type ?? null,
          loadValue: activity.load?.value ?? null,
          status: set.status,
          feedback: set.feedback,
          actualReps: set.actualReps,
          weightValue: set.weight?.value ?? null,
          weightUnit: set.weight?.unit ?? null,
        });
    }
  const muscles = [...exerciseIds].sort().flatMap((exerciseId) =>
    (memory.exercises.get(exerciseId)?.primaryMuscles ?? []).map((name) => ({
      exerciseId,
      name,
    })),
  );
  return { programName: program.name, sessions, sets, muscles };
}

export function getMemoryExerciseSeriesFacts(
  memory: ApplicationMemory,
  reference: SetReference,
): ExerciseSeriesFacts | null {
  const { programId, sessionId, activityId, setId } = reference;
  const program = memory.programs.get(programId);
  const session = memory.sessions.get(memoryKey(programId, sessionId));
  const activity = memory.activities.get(
    memoryKey(programId, sessionId, activityId),
  );
  const set = activity && memory.setsByActivity.get(activity)?.get(setId)?.set;
  const exercise = activity?.exerciseId
    ? memory.exercises.get(activity.exerciseId)
    : undefined;
  if (!program || !session?.lineageId || !activity || !set || !exercise)
    return null;
  const occurrence = session.activities
    .slice(
      0,
      session.activities.findIndex((item) => item.id === activityId),
    )
    .filter((item) => item.exerciseId === exercise.id).length;
  const related = program.sessions.filter(
    (item) => item.lineageId === session.lineageId,
  );
  const sets: ExerciseSeriesFacts["sets"] = [];
  for (const item of related) {
    const matched = item.activities.filter(
      (candidate) => candidate.exerciseId === exercise.id,
    )[occurrence];
    if (!matched) continue;
    for (const [kind, entries] of [
      ["Main", matched.mainSets],
      ["Warmup", matched.warmupSets],
    ] as const)
      for (const entry of entries)
        sets.push({
          sessionId: item.id,
          activityId: matched.id,
          plannedReps: matched.reps,
          loadType: matched.load?.type ?? null,
          loadValue: matched.load?.value ?? null,
          id: entry.id,
          kind,
          status: entry.status,
          feedback: entry.feedback,
          actualReps: entry.actualReps,
          weightValue: entry.weight?.value ?? null,
          weightUnit: entry.weight?.unit ?? null,
          startMs: entry.startMs,
          endMs: entry.endMs,
        });
  }
  return {
    reference: { ...reference },
    selection: {
      sessionName: session.name,
      exerciseName: exercise.name,
      exerciseId: exercise.id,
      lineageId: session.lineageId,
      occurrence,
      maxValue: exercise.oneRepMax?.value ?? null,
      maxUnit: exercise.oneRepMax?.unit ?? null,
    },
    sessions: related.map(({ id, startMs, endMs }) => ({ id, startMs, endMs })),
    sets,
  };
}

export function getMemoryDeloadFacts(
  memory: ApplicationMemory,
  programId: string,
  sessionId: string,
): DeloadCandidateFacts | null {
  const seed = getMemorySessionEditorSeed(memory, programId, sessionId);
  const current = seed?.session;
  if (!current) return null;
  if (
    current.status !== "Done" ||
    current.lineageId === null ||
    !seed.policy?.canSetDeload
  )
    return { current, previous: null, exercises: [] };
  const program = memory.programs.get(programId);
  if (!program) return null;
  const currentIndex = program.sessions.findIndex(
    (session) => session.id === sessionId,
  );
  const currentTime = current.startMs ?? current.endMs ?? 0;
  let selected: { session: Session; index: number } | null = null;
  for (const [index, session] of program.sessions.entries()) {
    if (
      session.lineageId !== current.lineageId ||
      session.status !== "Done" ||
      session.deload
    )
      continue;
    const time = session.startMs ?? session.endMs ?? 0;
    if (time > currentTime || (time === currentTime && index >= currentIndex))
      continue;
    const bestTime = selected
      ? (selected.session.startMs ?? selected.session.endMs ?? 0)
      : -Infinity;
    if (
      !selected ||
      time > bestTime ||
      (time === bestTime && index > selected.index)
    )
      selected = { session, index };
  }
  if (!selected) return { current, previous: null, exercises: [] };
  const previous = getMemorySessionEditorSeed(
    memory,
    programId,
    selected.session.id,
  )?.session;
  if (!previous)
    throw new Error("The previous lineage session could not be loaded.");
  const ids = new Set(
    [...current.activities, ...previous.activities].flatMap(({ exerciseId }) =>
      exerciseId ? [exerciseId] : [],
    ),
  );
  const exercises = memory.data.exercises
    .filter(({ id }) => ids.has(id))
    .map(({ id, name, loadKind, oneRepMax }) => ({
      id,
      name,
      loadKind,
      maxValue: oneRepMax?.value ?? null,
      maxUnit: oneRepMax?.unit ?? null,
    }));
  return { current, previous, exercises };
}

export function getMemoryPlanningWeightHints(
  memory: ApplicationMemory,
  programId: string,
  source: PlanningWeightSource,
  activities: readonly PlanningWeightActivity[],
  kind: "Warmup" | "Main",
): PlanningWeightHint[] {
  const counts = new Map<string, number>();
  const requests = activities.flatMap((activity, activityIndex) => {
    if (activity.exerciseId === null) return [];
    const occurrence = counts.get(activity.exerciseId) ?? 0;
    counts.set(activity.exerciseId, occurrence + 1);
    return activity.loadType === "RPE"
      ? [{ activityIndex, exerciseId: activity.exerciseId, occurrence }]
      : [];
  });
  if (!requests.length) return [];
  if (!source)
    return requests.map(({ activityIndex }) => ({
      activityIndex,
      weight: null,
    }));
  const selected = memory.sessions.get(memoryKey(programId, source.sessionId));
  if (!selected) throw new Error("The planning source no longer exists.");
  const program = memory.programs.get(programId);
  const others =
    source.kind === "session" && selected.lineageId !== null && program
      ? program.sessions
          .filter(
            (session) =>
              session.id !== selected.id &&
              session.lineageId === selected.lineageId,
          )
          .reverse()
      : [];
  return requests.map(({ activityIndex, exerciseId, occurrence }) => {
    for (const session of [selected, ...others]) {
      const activity = session.activities.filter(
        (item) => item.exerciseId === exerciseId,
      )[occurrence];
      const sets =
        kind === "Warmup" ? activity?.warmupSets : activity?.mainSets;
      const weight = sets
        ?.slice()
        .reverse()
        .find((set) => set.weight !== null)?.weight;
      if (weight) return { activityIndex, weight: { ...weight } };
    }
    return { activityIndex, weight: null };
  });
}

export type MemorySetChange =
  | {
      type: "patch";
      reference: SetReference;
      patch: SetRecordingPatch;
      nowMs: number;
    }
  | {
      type: "start";
      reference: SetReference;
      measurements: SetMeasurements;
      nowMs: number;
    }
  | {
      type: "complete";
      reference: SetReference;
      measurements: SetMeasurements;
      nowMs: number;
      nextId: string | null;
    };

export type MemoryChange =
  | MemorySetChange
  | { type: "exercise-notes"; exerciseId: string; notes: string | null }
  | { type: "program-name"; programId: string; name: string }
  | {
      type: "session-deload";
      programId: string;
      sessionId: string;
      deload: boolean;
      nowMs: number;
    }
  | {
      type: "replace-sessions";
      sessions: SessionDetail[];
      renameLineage?: boolean;
    }
  | { type: "delete-session"; programId: string; sessionId: string }
  | { type: "create-program"; programId: string; name: string }
  | { type: "delete-program"; programId: string }
  | { type: "exercise-record"; exercise: SavedExercise }
  | { type: "equipment"; equipment: Equipment }
  | { type: "muscles"; muscles: string[] }
  | { type: "already-applied" };

function removeMemorySession(
  memory: ApplicationMemory,
  programId: string,
  sessionId: string,
) {
  const key = memoryKey(programId, sessionId);
  const existing = memory.sessions.get(key);
  if (!existing) return;
  for (const activity of existing.activities) {
    memory.activities.delete(memoryKey(programId, sessionId, activity.id));
    memory.setsByActivity.delete(activity);
  }
  memory.sessions.delete(key);
  memory.sessionRevisions.delete(key);
}

function replaceMemorySession(
  memory: ApplicationMemory,
  detail: SessionDetail,
): boolean {
  const program = memory.programs.get(detail.programId);
  if (!program) return false;
  const index = program.sessions.findIndex((item) => item.id === detail.id);
  removeMemorySession(memory, detail.programId, detail.id);
  const convertSet = ({
    kind: _kind,
    position: _position,
    weightValue,
    weightUnit,
    ...set
  }: SessionSet) => ({
    ...set,
    weight:
      weightValue !== null && weightUnit !== null
        ? { value: weightValue, unit: weightUnit }
        : null,
  });
  const session: Session = {
    id: detail.id,
    name: detail.name,
    lineageId: detail.lineageId,
    status: detail.status,
    deload: detail.deload,
    startMs: detail.startMs,
    endMs: detail.endMs,
    lastActivityAtMs: detail.lastActivityAtMs,
    activities: detail.activities.map((activity) => ({
      id: activity.id,
      exerciseId: activity.exerciseId,
      reps: activity.reps,
      restMinutes: activity.restMinutes,
      load:
        activity.loadType !== null && activity.loadValue !== null
          ? { type: activity.loadType, value: activity.loadValue }
          : null,
      warmupSets: activity.warmupSets.map(convertSet),
      mainSets: activity.mainSets.map(convertSet),
    })),
  };
  if (index < 0) program.sessions.push(session);
  else program.sessions[index] = session;
  if (session.lineageId && !program.lineages.includes(session.lineageId))
    program.lineages.push(session.lineageId);
  memory.sessions.set(memoryKey(detail.programId, detail.id), session);
  memory.sessionRevisions.set(
    memoryKey(detail.programId, detail.id),
    detail.revision,
  );
  for (const [activityIndex, activity] of session.activities.entries()) {
    memory.activities.set(
      memoryKey(detail.programId, detail.id, activity.id),
      activity,
    );
    const original = detail.activities[activityIndex];
    if (!original) return false;
    const indexedSets = new Map<string, IndexedSet>();
    for (const [kind, sets] of [
      ["Warmup", activity.warmupSets],
      ["Main", activity.mainSets],
    ] as const) {
      const originalSets =
        kind === "Warmup" ? original.warmupSets : original.mainSets;
      for (const [setIndex, set] of sets.entries()) {
        const position = originalSets[setIndex]?.position;
        if (position === undefined) return false;
        indexedSets.set(set.id, { set, position });
      }
    }
    memory.setsByActivity.set(activity, indexedSets);
  }
  return true;
}

export function applyMemoryChange(
  memory: ApplicationMemory,
  change: MemoryChange,
): boolean {
  if (change.type === "already-applied") return true;
  if (change.type === "exercise-record") {
    const { revision, ...exercise } = change.exercise;
    const old = memory.exercises.get(exercise.id);
    if (old) Object.assign(old, exercise);
    else {
      memory.data.exercises.push(exercise);
      memory.exercises.set(exercise.id, exercise);
    }
    memory.exerciseRevisions.set(exercise.id, revision);
    return true;
  }
  if (change.type === "equipment") {
    const barbellIds = new Set(
      change.equipment.barbells.map(({ barbellId }) => barbellId),
    );
    for (const exercise of memory.data.exercises) {
      if (exercise.barbellId !== null && !barbellIds.has(exercise.barbellId)) {
        const revision = memory.exerciseRevisions.get(exercise.id);
        if (revision === undefined) return false;
        exercise.barbellId = null;
        memory.exerciseRevisions.set(exercise.id, revision + 1);
      }
    }
    memory.data.equipment = {
      barbells: change.equipment.barbells.map(({ barbellId, ...item }) => ({
        ...item,
        id: barbellId,
      })),
      plates: change.equipment.plates.map(({ plateId, ...item }) => ({
        ...item,
        id: plateId,
      })),
    };
    return true;
  }
  if (change.type === "muscles") {
    const labels = new Set(change.muscles);
    for (const exercise of memory.data.exercises) {
      const muscles = exercise.primaryMuscles.filter((label) =>
        labels.has(label),
      );
      if (muscles.length !== exercise.primaryMuscles.length) {
        const revision = memory.exerciseRevisions.get(exercise.id);
        if (revision === undefined) return false;
        exercise.primaryMuscles = muscles;
        memory.exerciseRevisions.set(exercise.id, revision + 1);
      }
    }
    memory.data.muscleGroups = change.muscles;
    return true;
  }
  if (change.type === "create-program") {
    if (memory.programs.has(change.programId)) return false;
    const program = {
      id: change.programId,
      name: change.name,
      lineages: [],
      sessions: [],
    };
    memory.data.programs.push(program);
    memory.programs.set(program.id, program);
    return true;
  }
  if (change.type === "delete-program") {
    const program = memory.programs.get(change.programId);
    if (!program) return false;
    for (const session of program.sessions)
      removeMemorySession(memory, change.programId, session.id);
    memory.programs.delete(change.programId);
    memory.data.programs = memory.data.programs.filter(
      (item) => item.id !== change.programId,
    );
    return true;
  }
  if (change.type === "replace-sessions") {
    for (const detail of change.sessions) {
      const program = memory.programs.get(detail.programId);
      if (!program) return false;
      if (change.renameLineage) {
        const lineage = detail.lineageId ?? detail.id;
        for (const sibling of program.sessions) {
          if (
            sibling.id !== detail.id &&
            (sibling.lineageId ?? sibling.id) === lineage
          ) {
            const key = memoryKey(detail.programId, sibling.id);
            const revision = memory.sessionRevisions.get(key);
            if (revision === undefined) return false;
            sibling.name = detail.name;
            memory.sessionRevisions.set(key, revision + 1);
          }
        }
      }
      if (!replaceMemorySession(memory, detail)) return false;
    }
    return true;
  }
  if (change.type === "delete-session") {
    const program = memory.programs.get(change.programId);
    if (
      !program ||
      !memory.sessions.has(memoryKey(change.programId, change.sessionId))
    )
      return false;
    removeMemorySession(memory, change.programId, change.sessionId);
    program.sessions = program.sessions.filter(
      (session) => session.id !== change.sessionId,
    );
    return true;
  }
  if (
    change.type === "patch" ||
    change.type === "start" ||
    change.type === "complete"
  )
    return applyMemorySetChange(memory, change);
  if (change.type === "program-name") {
    const program = memory.programs.get(change.programId);
    if (!program) return false;
    program.name = change.name;
    return true;
  }
  if (change.type === "exercise-notes") {
    const exercise = memory.exercises.get(change.exerciseId);
    const revision = memory.exerciseRevisions.get(change.exerciseId);
    if (!exercise || revision === undefined) return false;
    exercise.notes = change.notes;
    memory.exerciseRevisions.set(change.exerciseId, revision + 1);
    return true;
  }
  const key = memoryKey(change.programId, change.sessionId);
  const session = memory.sessions.get(key);
  const revision = memory.sessionRevisions.get(key);
  if (!session || revision === undefined) return false;
  session.deload = change.deload;
  session.lastActivityAtMs = change.nowMs;
  memory.sessionRevisions.set(key, revision + 1);
  return true;
}

/** Apply a committed set change before notifying subscribers. */
export function applyMemorySetChange(
  memory: ApplicationMemory,
  change: MemorySetChange,
): boolean {
  const { programId, sessionId, activityId, setId } = change.reference;
  const sessionKey = memoryKey(programId, sessionId);
  const session = memory.sessions.get(sessionKey);
  const activity = memory.activities.get(
    memoryKey(programId, sessionId, activityId),
  );
  const set = activity && memory.setsByActivity.get(activity)?.get(setId)?.set;
  const revision = memory.sessionRevisions.get(sessionKey);
  if (!session || !activity || !set || revision === undefined) return false;
  if (change.type === "patch") {
    if (change.patch.actualReps !== undefined)
      set.actualReps = change.patch.actualReps;
    if (change.patch.weight !== undefined) set.weight = change.patch.weight;
    if (change.patch.feedback !== undefined)
      set.feedback = change.patch.feedback;
  } else {
    set.actualReps = change.measurements.actualReps;
    set.weight = change.measurements.weight;
    set.feedback = change.measurements.feedback;
    if (change.type === "start") {
      set.startMs = change.nowMs;
      set.status = "Ready";
      if (session.status === "Planned") {
        session.startMs = change.nowMs;
        session.status = "Ready";
      }
    } else {
      set.endMs =
        set.startMs === null
          ? change.nowMs
          : Math.min(change.nowMs, set.startMs + 20 * 60 * 1000);
      set.status = "Done";
      if (change.nextId) {
        const next = memory.setsByActivity
          .get(activity)
          ?.get(change.nextId)?.set;
        if (!next) return false;
        next.status = "Ready";
        next.startMs = change.nowMs;
      }
    }
  }
  session.lastActivityAtMs = change.nowMs;
  memory.sessionRevisions.set(sessionKey, revision + 1);
  return true;
}

/** All rows for a week are already resident, so preserve the original unpaged list. */
export function getMemoryProgramWeek(
  memory: ApplicationMemory,
  programId: string,
  week: number,
  programStartMs: number,
  currentWeek: number,
  nowMs: number,
) {
  const program = memory.programs.get(programId);
  if (!program) return null;
  const start = addDays(
    startOfDay(new Date(programStartMs)),
    (week - 1) * 7,
  ).getTime();
  const end = addDays(new Date(start), 7).getTime();
  const items = program.sessions
    .map((session, position) => ({ session, position }))
    .filter(({ session }) =>
      session.status === "Planned"
        ? week === currentWeek
        : session.startMs === null
          ? week === currentWeek
          : session.startMs >= start && session.startMs < end,
    );
  const group = (session: Session) =>
    session.status === "Planned" ? 0 : session.status === "Ready" ? 1 : 2;
  items.sort((a, b) => {
    const order = group(a.session) - group(b.session);
    if (order) return order;
    const aUndated =
      a.session.status !== "Planned" && a.session.startMs === null;
    const bUndated =
      b.session.status !== "Planned" && b.session.startMs === null;
    if (aUndated !== bUndated) return aUndated ? -1 : 1;
    const aTime = a.session.status === "Planned" ? 0 : (a.session.startMs ?? 0);
    const bTime = b.session.status === "Planned" ? 0 : (b.session.startMs ?? 0);
    return bTime - aTime || b.position - a.position;
  });
  return {
    week,
    items: items.map(({ session }) => ({
      id: session.id,
      name: session.name,
      lineageId: session.lineageId,
      status: session.status,
      deload: session.deload,
      startMs: session.startMs,
      endMs: session.endMs,
      day:
        session.status === "Planned"
          ? null
          : weekAndDayNumbersFromStart(
              new Date(programStartMs),
              new Date(session.startMs ?? nowMs),
            ).day,
    })),
    nextCursor: null,
  };
}

export function getMemoryTemplateChoices(
  memory: ApplicationMemory,
  programId: string,
): TemplateChoice[] {
  const program = memory.programs.get(programId);
  if (!program) return [];
  const candidates = program.sessions
    .map((session, position) => ({ session, position }))
    .filter(
      ({ session }) =>
        (session.status === "Done" || session.status === "Incomplete") &&
        session.endMs !== null,
    );
  candidates.sort(
    (a, b) =>
      (b.session.startMs ?? -Infinity) - (a.session.startMs ?? -Infinity) ||
      a.position - b.position,
  );
  const seen = new Set<string>();
  const selected = candidates.filter(({ session }) => {
    const key = session.lineageId ?? session.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  selected.sort(
    (a, b) =>
      (a.session.startMs ?? -Infinity) - (b.session.startMs ?? -Infinity) ||
      b.position - a.position,
  );
  return selected.map(({ session }) => {
    const revision = memory.sessionRevisions.get(
      memoryKey(programId, session.id),
    );
    if (revision === undefined)
      throw new Error("The session revision is missing.");
    return {
      sessionId: session.id,
      name: session.name,
      lineageId: session.lineageId,
      startMs: session.startMs,
      endMs: session.endMs,
      revision,
    };
  });
}

export function resolveMemoryTemplateChoice(
  memory: ApplicationMemory,
  programId: string,
  sessionId: string,
): { kind: "planned" | "template"; sessionId: string } | null {
  const program = memory.programs.get(programId);
  const selected = memory.sessions.get(memoryKey(programId, sessionId));
  if (!program || !selected) return null;
  const lineage = selected.lineageId ?? selected.id;
  const planned = program.sessions.find(
    (item) =>
      item.status === "Planned" && (item.lineageId ?? item.id) === lineage,
  );
  if (planned) return { kind: "planned", sessionId: planned.id };
  if (selected.lineageId === null) return { kind: "template", sessionId };
  let source: Session | undefined;
  for (const item of program.sessions) {
    if (
      item.lineageId !== selected.lineageId ||
      (item.status !== "Done" && item.status !== "Incomplete") ||
      item.deload
    )
      continue;
    if (
      !source ||
      (item.startMs ?? item.endMs ?? 0) >= (source.startMs ?? source.endMs ?? 0)
    )
      source = item;
  }
  return { kind: "template", sessionId: source?.id ?? sessionId };
}

/** Project an editor seed synchronously from the same data used by the session screen. */
export function getMemorySessionEditorSeed(
  memory: ApplicationMemory,
  programId: string,
  sessionId: string | null,
): SessionEditorSeed | null {
  const program = memory.programs.get(programId);
  if (!program) return null;
  const header = { id: program.id, name: program.name };
  if (sessionId === null)
    return {
      generation: memory.generation,
      program: header,
      session: null,
      policy: null,
      exercises: [],
    };
  const source = memory.sessions.get(memoryKey(programId, sessionId));
  if (!source) return null;
  const revision = memory.sessionRevisions.get(memoryKey(programId, sessionId));
  if (revision === undefined)
    throw new Error("The session revision is missing.");
  const mapSets = (
    sets: Activity["mainSets"],
    kind: SessionSet["kind"],
    activity: Activity,
  ): SessionSet[] =>
    sets.map(({ weight, ...set }) => {
      const position = memory.setsByActivity
        .get(activity)
        ?.get(set.id)?.position;
      if (position === undefined)
        throw new Error("The workout set position is missing.");
      return {
        ...set,
        kind,
        position,
        weightValue: weight?.value ?? null,
        weightUnit: weight?.unit ?? null,
      };
    });
  const session: SessionDetail = {
    ...source,
    programId,
    revision,
    activities: source.activities.map((sourceActivity) => {
      const { load, warmupSets, mainSets, ...activity } = sourceActivity;
      const exercise = activity.exerciseId
        ? memory.exercises.get(activity.exerciseId)
        : undefined;
      return {
        ...activity,
        exerciseName: exercise?.name ?? null,
        exerciseDeleted: exercise?.deleted ?? false,
        loadType: load?.type ?? null,
        loadValue: load?.value ?? null,
        warmupSets: mapSets(warmupSets, "Warmup", sourceActivity),
        mainSets: mapSets(mainSets, "Main", sourceActivity),
      };
    }),
  };
  const index = program.sessions.findIndex((item) => item.id === sessionId);
  const sameLineage = (item: Session) =>
    source.lineageId !== null && item.lineageId === source.lineageId;
  const canSetDeload = program.sessions.slice(0, index).some(sameLineage);
  const latest =
    source.status === "Done" && source.lineageId !== null
      ? program.sessions.reduce<{ session: Session; position: number } | null>(
          (best, item, position) => {
            if (!sameLineage(item) || item.status !== "Done") return best;
            const time = item.startMs ?? item.endMs ?? 0;
            const bestTime = best?.session.startMs ?? best?.session.endMs ?? 0;
            return !best ||
              time > bestTime ||
              (time === bestTime && position > best.position)
              ? { session: item, position }
              : best;
          },
          null,
        )
      : null;
  const referenced = new Set(
    source.activities.flatMap(({ exerciseId }) =>
      exerciseId ? [exerciseId] : [],
    ),
  );
  return {
    generation: memory.generation,
    program: header,
    session,
    policy: {
      canSetDeload,
      isLatestCompletedInLineage: latest?.session.id === sessionId,
    },
    exercises: memory.data.exercises
      .filter(({ id }) => referenced.has(id))
      .map(({ id, name, deleted, loadKind, oneRepMax }) => ({
        id,
        name,
        deleted,
        loadKind,
        oneRepMax,
      })),
  };
}

export function getMemorySetContext(
  memory: ApplicationMemory,
  reference: SetReference,
): SetExecutionContext | null {
  const { programId, sessionId, activityId, setId } = reference;
  const session = memory.sessions.get(memoryKey(programId, sessionId));
  const activity = memory.activities.get(
    memoryKey(programId, sessionId, activityId),
  );
  if (!session || !activity) return null;
  const allSets = [...activity.warmupSets, ...activity.mainSets];
  const sourceSet = memory.setsByActivity.get(activity)?.get(setId)?.set;
  if (!sourceSet) return null;
  const sessionRevision = memory.sessionRevisions.get(
    memoryKey(programId, sessionId),
  );
  if (sessionRevision === undefined)
    throw new Error("The session revision is missing.");
  const warmupIndex = activity.warmupSets.findIndex(
    (item) => item.id === setId,
  );
  const mainIndex = activity.mainSets.findIndex((item) => item.id === setId);
  if (warmupIndex < 0 && mainIndex < 0)
    throw new Error("The workout set has no owning activity.");
  const kind = warmupIndex >= 0 ? "Warmup" : "Main";
  const mapSet = (
    source: WorkoutSet,
    setKind: SessionSet["kind"],
  ): SessionSet => {
    const position = memory.setsByActivity
      .get(activity)
      ?.get(source.id)?.position;
    if (position === undefined)
      throw new Error("The workout set position is missing.");
    const { weight, ...fields } = source;
    return {
      ...fields,
      kind: setKind,
      position,
      weightValue: weight?.value ?? null,
      weightUnit: weight?.unit ?? null,
    };
  };
  const set = mapSet(sourceSet, kind);
  const record = activity.exerciseId
    ? memory.exercises.get(activity.exerciseId)
    : undefined;
  const revision = activity.exerciseId
    ? memory.exerciseRevisions.get(activity.exerciseId)
    : undefined;
  if (record && revision === undefined)
    throw new Error("The exercise revision is missing.");
  const exercise: SetExecutionContext["exercise"] = record
    ? {
        id: record.id,
        name: record.name,
        deleted: record.deleted,
        revision: revision ?? 0,
        loadKind: record.loadKind,
        barbellId: record.barbellId,
        oneRepMax: record.oneRepMax,
      }
    : null;
  const firstMainSet = activity.mainSets[0]
    ? mapSet(activity.mainSets[0], "Main")
    : null;
  const targetActivity = {
    id: activity.id,
    exerciseId: activity.exerciseId,
    reps: activity.reps,
    loadType: activity.load?.type ?? null,
    loadValue: activity.load?.value ?? null,
    restMinutes: activity.restMinutes,
    warmupSetCount: activity.warmupSets.length,
    mainSetCount: activity.mainSets.length,
  };
  const weight = (item: SessionSet) =>
    item.weightValue !== null && item.weightUnit !== null
      ? { value: item.weightValue, unit: item.weightUnit }
      : null;
  const index = kind === "Main" ? mainIndex : warmupIndex;
  const program = memory.programs.get(programId);
  const sessionIndex =
    program?.sessions.findIndex((item) => item.id === sessionId) ?? -1;
  const hasTemplateHistory =
    session.lineageId !== null &&
    !!program?.sessions
      .slice(0, sessionIndex)
      .some((item) => item.lineageId === session.lineageId);
  const sessionHeader = {
    id: session.id,
    programId,
    name: session.name,
    lineageId: session.lineageId,
    deload: session.deload,
    status: session.status,
    startMs: session.startMs,
    endMs: session.endMs,
    lastActivityAtMs: session.lastActivityAtMs,
    revision: sessionRevision,
  };
  return {
    reference: { ...reference },
    session: sessionHeader,
    activity: targetActivity,
    exercise,
    set,
    firstMainSet,
    targetWeight: plannedSetWeight(
      targetActivity,
      { kind: set.kind, index, weight: weight(set) },
      exercise?.oneRepMax ?? null,
    ),
    mainTargetWeight: firstMainSet
      ? plannedSetWeight(
          targetActivity,
          { kind: "Main", index: 0, weight: weight(firstMainSet) },
          exercise?.oneRepMax ?? null,
        )
      : null,
    hasTemplateHistory,
    isStartable:
      (session.status === "Planned" || session.status === "Ready") &&
      set.status === "Planned" &&
      allSets.find(
        (item) => item.status === "Planned" || item.status === "Ready",
      )?.id === setId,
    canComplete:
      session.status === "Ready" &&
      set.status === "Ready" &&
      (set.actualReps ?? 0) > 0,
  };
}
