import { normalizeExerciseName } from "@activity-log/ui/utils";

import type { prepareLegacyConversion } from "../legacy/conversion";
import type { PortableDataV2 } from "./portable-v2";
import { parsePortableBackupV2 } from "./portable-v2";

type PreparedRows = ReturnType<typeof prepareLegacyConversion>;
type PortableActivity =
  PortableDataV2["programs"][number]["sessions"][number]["activities"][number];
type PortableActivityFields = PortableActivity["alternatives"][number];

/** Every exercise row of an activity: its main rows, then alternatives. */
function portableRows(activity: PortableActivity): PortableActivityFields[] {
  return [activity, ...activity.supersets].flatMap((main) => [
    main,
    ...main.alternatives,
  ]);
}

function unique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`The backup contains duplicate ${label}.`);
}

/** Validate hierarchy and references before the user confirms replacement. */
export function prepareVersion2Restore(contents: string): PreparedRows {
  const { data } = parsePortableBackupV2(contents);
  unique(
    data.programs.map(({ id }) => id),
    "program IDs",
  );
  unique(
    data.exercises.map(({ id }) => id),
    "exercise IDs",
  );
  unique(
    data.exercises
      .filter(({ deleted }) => !deleted)
      .map(({ name }) => normalizeExerciseName(name)),
    "active exercise names",
  );
  unique(
    data.presets.map(({ id }) => id),
    "preset IDs",
  );
  unique(
    data.equipment.barbells.map(({ id }) => id),
    "barbell IDs",
  );
  unique(
    data.equipment.plates.map(({ id }) => id),
    "plate IDs",
  );
  const exerciseIds = new Set(data.exercises.map(({ id }) => id));
  const barbellIds = new Set(data.equipment.barbells.map(({ id }) => id));
  for (const exercise of data.exercises)
    if (exercise.barbellId !== null && !barbellIds.has(exercise.barbellId))
      throw new Error("The backup references missing equipment.");
  for (const program of data.programs) {
    unique(program.lineages, "lineage IDs");
    unique(
      program.sessions.map(({ id }) => id),
      "session IDs",
    );
    const lineages = new Set(program.lineages);
    for (const session of program.sessions) {
      if (session.lineageId !== null && !lineages.has(session.lineageId))
        throw new Error("The backup references a missing lineage.");
      unique(
        session.activities.flatMap(portableRows).map(({ id }) => id),
        "activity IDs",
      );
      for (const activity of session.activities.flatMap(portableRows)) {
        if (
          activity.exerciseId !== null &&
          !exerciseIds.has(activity.exerciseId)
        )
          throw new Error("The backup references a missing exercise.");
        unique(
          [...activity.warmupSets, ...activity.mainSets].map(({ id }) => id),
          "set IDs",
        );
      }
    }
  }
  return toRows(data);
}

function toRows(data: PortableDataV2): PreparedRows {
  const settings: PreparedRows["settings"] = {
    barbells: [],
    plates: [],
    exercises: [],
    presets: [],
    muscles: [],
    catalog: [],
    exerciseMuscles: [],
    presetMuscles: [],
  };
  const history: PreparedRows["history"] = {
    programs: [],
    lineages: [],
    sessions: [],
    activities: [],
    sets: [],
  };
  const labelIds = new Map<string, number>();
  const label = (name: string) => {
    const existing = labelIds.get(name);
    if (existing !== undefined) return existing;
    const id = labelIds.size + 1;
    labelIds.set(name, id);
    settings.muscles.push({
      id,
      name,
      normalized_name: name.toLocaleLowerCase(),
    });
    return id;
  };
  data.equipment.barbells.forEach((item, position) =>
    settings.barbells.push({ ...item, position }),
  );
  data.equipment.plates.forEach((item, position) =>
    settings.plates.push({ ...item, position }),
  );
  data.exercises.forEach((item, position) => {
    settings.exercises.push({
      id: item.id,
      name: item.name,
      normalized_name: normalizeExerciseName(item.name),
      position,
      load_kind: item.loadKind,
      barbell_id: item.barbellId,
      one_rep_max_value: item.oneRepMax?.value ?? null,
      one_rep_max_unit: item.oneRepMax?.unit ?? null,
      notes: item.notes,
      deleted: Number(item.deleted),
    });
    item.primaryMuscles.forEach((name, index) =>
      settings.exerciseMuscles.push({
        exercise_id: item.id,
        position: index,
        muscle_id: label(name),
      }),
    );
  });
  data.presets.forEach((item, position) => {
    settings.presets.push({
      id: item.id,
      name: item.name,
      position,
      load_kind: item.loadKind,
    });
    item.primaryMuscles.forEach((name, index) =>
      settings.presetMuscles.push({
        preset_id: item.id,
        position: index,
        muscle_id: label(name),
      }),
    );
  });
  data.muscleGroups.forEach((name, position) =>
    settings.catalog.push({ position, muscle_id: label(name) }),
  );
  data.programs.forEach((program, position) => {
    history.programs.push({ id: program.id, name: program.name, position });
    program.lineages.forEach((id) =>
      history.lineages.push({ program_id: program.id, id }),
    );
    program.sessions.forEach((session, sessionPosition) => {
      history.sessions.push({
        program_id: program.id,
        id: session.id,
        lineage_id: session.lineageId,
        name: session.name,
        position: sessionPosition,
        status: session.status,
        deload: Number(session.deload),
        start_ms: session.startMs,
        end_ms: session.endMs,
        last_activity_at_ms: session.lastActivityAtMs,
      });
      const pushActivity = (
        activity: PortableActivityFields,
        position: number,
        parentId: string | null,
        supersetId: string | null,
      ) => {
        history.activities.push({
          program_id: program.id,
          session_id: session.id,
          id: activity.id,
          parent_activity_id: parentId,
          superset_activity_id: supersetId,
          exercise_id: activity.exerciseId,
          position,
          reps: activity.reps,
          load_type: activity.load?.type ?? null,
          load_value: activity.load?.value ?? null,
          rest_minutes: activity.restMinutes,
        });
        for (const [kind, sets] of [
          ["Warmup", activity.warmupSets],
          ["Main", activity.mainSets],
        ] as const) {
          sets.forEach((set, setPosition) =>
            history.sets.push({
              program_id: program.id,
              session_id: session.id,
              activity_id: activity.id,
              id: set.id,
              kind,
              position: setPosition,
              status: set.status,
              feedback: set.feedback,
              actual_reps: set.actualReps,
              weight_value: set.weight?.value ?? null,
              weight_unit: set.weight?.unit ?? null,
              start_ms: set.startMs,
              end_ms: set.endMs,
            }),
          );
        }
      };
      // Superset members are main activities stored right after their leader.
      let mainPosition = 0;
      for (const activity of session.activities)
        for (const main of [activity, ...activity.supersets]) {
          pushActivity(
            main,
            mainPosition++,
            null,
            main === activity ? null : activity.id,
          );
          main.alternatives.forEach((alternative, alternativePosition) =>
            pushActivity(alternative, alternativePosition, main.id, null),
          );
        }
    });
  });
  return { settings, history };
}
