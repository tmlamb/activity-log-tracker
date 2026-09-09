import { addDays, differenceInCalendarDays } from "date-fns";

export interface Weight {
  value: number;
  unit: "lbs" | "kg";
}

export interface Load {
  value: number;
  type: "PERCENT" | "RPE";
}

export type EquipmentPlate = Weight & {
  plateId: string;
  quantity: number;
};

export type EquipmentBarbell = Weight & {
  barbellId: string;
};

export interface WorkoutSet {
  workoutSetId: string;
  start?: Date;
  end?: Date;
  status: "Planned" | "Ready" | "Done" | "Incomplete";
  type: "Warmup" | "Main";
  weight?: Weight;
  actualReps?: number;
  feedback: "Easy" | "Neutral" | "Hard";
}

export type WarmupSet = WorkoutSet & {
  type: "Warmup";
};

export type MainSet = WorkoutSet & {
  type: "Main";
};

export type MuscleGroup = string;

export const normalizeMuscleGroup = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const muscleGroup = value.trim();
  return muscleGroup || undefined;
};

export const normalizeMuscleGroups = (values: readonly unknown[]) => {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const muscleGroup = normalizeMuscleGroup(value);
    const key = muscleGroup?.toLocaleLowerCase();
    if (!muscleGroup || !key || seen.has(key)) return [];

    seen.add(key);
    return [muscleGroup];
  });
};

export interface Activity {
  activityId: string;
  reps: number;
  load: Load;
  rest: number;
  exerciseId: string;
  warmupSets: WarmupSet[];
  mainSets: MainSet[];
}

export interface Exercise {
  name: string;
  exerciseId: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT";
  barbellId?: string;
  oneRepMax?: Weight;
  primaryMuscles?: MuscleGroup[];
  notes?: string;
  deleted?: boolean;
}

export type SessionStatus = "Planned" | "Ready" | "Incomplete" | "Done";

export interface Session {
  name: string;
  sessionId: string;
  templateId?: string;
  deload: boolean;
  start?: Date;
  end?: Date;
  lastActivityAt?: Date;
  status: SessionStatus;
  activities: Activity[];
}

export interface Program {
  name: string;
  programId: string;
  sessions: Session[];
}

export interface ProgramInsightMetrics {
  sets: number;
  reps: number;
  volumeLbs: number;
  hardSets: number;
  easySets: number;
}

export interface ProgramInsightMuscleGroup extends ProgramInsightMetrics {
  muscleGroup: MuscleGroup;
}

export interface ProgramInsightWeek {
  week: number;
  start: Date;
  end: Date;
  muscleGroups: ProgramInsightMuscleGroup[];
}

export interface ProgramInsights {
  muscleGroups: MuscleGroup[];
  weeks: ProgramInsightWeek[];
}

export interface ExerciseSetInsightPoint {
  sessionId: string;
  date?: Date;
  reps: number;
  weightLbs: number;
  volumeLbs: number;
  feedback?: WorkoutSet["feedback"];
  current: boolean;
  completed: boolean;
  notStarted: boolean;
}

export interface ExerciseSetInsights {
  setType: WorkoutSet["type"];
  setNumber: number;
  selected: boolean;
  points: ExerciseSetInsightPoint[];
}

export interface Equipment {
  barbells: EquipmentBarbell[];
  plates: EquipmentPlate[];
}

export const SESSION_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
export const LEGACY_SESSION_DURATION_MS = 60 * 60 * 1000;

export const isSessionTerminalStatus = (status: SessionStatus) =>
  status === "Incomplete" || status === "Done";

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const latestCompletedSetEnd = (session: Session) => {
  let latestEnd: Date | undefined;

  session.activities.forEach((activity) => {
    [...activity.warmupSets, ...activity.mainSets].forEach((workoutSet) => {
      if (
        workoutSet.status === "Done" &&
        isValidDate(workoutSet.end) &&
        (!latestEnd || workoutSet.end.getTime() > latestEnd.getTime())
      ) {
        latestEnd = workoutSet.end;
      }
    });
  });

  return latestEnd;
};

export const finalizeWorkoutSet = <T extends WorkoutSet>(
  workoutSet: T,
  end: Date,
): T => {
  if ((workoutSet.actualReps ?? 0) > 0) {
    if (workoutSet.status === "Done") return workoutSet;

    const setEnd = workoutSet.end ?? end;
    return {
      ...workoutSet,
      start:
        workoutSet.start && workoutSet.start.getTime() <= setEnd.getTime()
          ? workoutSet.start
          : setEnd,
      end: setEnd,
      status: "Done",
    };
  }

  if (!workoutSet.start) {
    return { ...workoutSet, status: "Incomplete" };
  }

  const setEnd = workoutSet.end ?? end;

  return {
    ...workoutSet,
    start:
      workoutSet.start.getTime() <= setEnd.getTime()
        ? workoutSet.start
        : setEnd,
    end: setEnd,
    status: "Incomplete",
  };
};

export const reconcileCompletedWorkoutSet = <T extends WorkoutSet>(
  workoutSet: T,
  actualReps: number | undefined,
  sessionEnd: Date,
): T => {
  const updatedWorkoutSet = { ...workoutSet, actualReps };

  return (actualReps ?? 0) > 0
    ? finalizeWorkoutSet(updatedWorkoutSet, sessionEnd)
    : { ...updatedWorkoutSet, status: "Incomplete" };
};

export const completeSession = (session: Session, end: Date): Session => ({
  ...session,
  end,
  lastActivityAt: end,
  status: "Done",
  activities: session.activities.map((activity) => ({
    ...activity,
    warmupSets: activity.warmupSets.map((workoutSet) =>
      finalizeWorkoutSet(workoutSet, end),
    ),
    mainSets: activity.mainSets.map((workoutSet) =>
      finalizeWorkoutSet(workoutSet, end),
    ),
  })),
});

const shiftDate = (date: Date | undefined, milliseconds: number) =>
  isValidDate(date) ? new Date(date.getTime() + milliseconds) : date;

export const shiftSessionStart = (session: Session, start: Date): Session => {
  if (!isValidDate(session.start)) return { ...session, start };

  const milliseconds = start.getTime() - session.start.getTime();
  const shiftWorkoutSet = <T extends WorkoutSet>(workoutSet: T): T => ({
    ...workoutSet,
    start: shiftDate(workoutSet.start, milliseconds),
    end: shiftDate(workoutSet.end, milliseconds),
  });

  return {
    ...session,
    start,
    end: shiftDate(session.end, milliseconds),
    activities: session.activities.map((activity) => ({
      ...activity,
      warmupSets: activity.warmupSets.map(shiftWorkoutSet),
      mainSets: activity.mainSets.map(shiftWorkoutSet),
    })),
  };
};

export const cleanupInactiveSession = (
  session: Session,
  now = new Date(),
): Session => {
  if (session.status !== "Ready") return session;

  const lastActivityAt = isValidDate(session.lastActivityAt)
    ? session.lastActivityAt
    : undefined;
  if (
    lastActivityAt &&
    now.getTime() - lastActivityAt.getTime() < SESSION_INACTIVITY_TIMEOUT_MS
  ) {
    return session;
  }

  const end =
    lastActivityAt ??
    latestCompletedSetEnd(session) ??
    (isValidDate(session.start)
      ? new Date(session.start.getTime() + LEGACY_SESSION_DURATION_MS)
      : now);

  return { ...completeSession(session, end), status: "Incomplete" };
};

const kilogramsToPounds = (kilograms: number) => kilograms * 2.2046226218;

export const round5 = (value: number) => Math.round(value / 5) * 5;

const warmupPercentageMap: Record<number, number[]> = {
  1: [0.6],
  2: [0.4, 0.6],
  3: [0.4, 0.5, 0.6],
  4: [0.4, 0.5, 0.6, 0.7],
  5: [0.3, 0.4, 0.5, 0.6, 0.7],
};

export const plannedWeightForWorkoutSet = (
  activity: Activity,
  workoutSet: WorkoutSet,
  oneRepMax?: Weight,
): Weight | undefined => {
  if (activity.load.type !== "PERCENT") {
    return workoutSet.weight;
  }
  if (!oneRepMax?.value) return undefined;

  const warmupPercentages =
    warmupPercentageMap[activity.warmupSets.length] ??
    warmupPercentageMap[5] ??
    [];
  const setIndex =
    workoutSet.type === "Main"
      ? activity.mainSets.findIndex(
          (item) => item.workoutSetId === workoutSet.workoutSetId,
        )
      : activity.warmupSets.findIndex(
          (item) => item.workoutSetId === workoutSet.workoutSetId,
        );
  if (setIndex < 0) return undefined;

  const percent =
    workoutSet.type === "Main"
      ? activity.load.value
      : (warmupPercentages[setIndex] ?? warmupPercentages.at(-1));
  if (!percent) return undefined;

  return {
    value: round5(oneRepMax.value * percent),
    unit: oneRepMax.unit,
  };
};

export const buildExerciseInsights = (
  program: Program,
  currentSession: Session,
  currentActivity: Activity,
  currentWorkoutSet: WorkoutSet,
  exercise: Exercise,
  now = new Date(),
): ExerciseSetInsights[] => {
  const emptyInsights: ExerciseSetInsights[] = [
    ...currentActivity.warmupSets.map((workoutSet, index) => ({
      setType: workoutSet.type,
      setNumber: index + 1,
      selected: workoutSet.workoutSetId === currentWorkoutSet.workoutSetId,
      points: [],
    })),
    ...currentActivity.mainSets.map((workoutSet, index) => ({
      setType: workoutSet.type,
      setNumber: index + 1,
      selected: workoutSet.workoutSetId === currentWorkoutSet.workoutSetId,
      points: [],
    })),
  ];
  const currentActivityIndex = currentSession.activities.findIndex(
    (item) => item.activityId === currentActivity.activityId,
  );
  if (!currentSession.templateId || currentActivityIndex < 0) {
    return emptyInsights;
  }

  const exerciseOccurrence =
    currentSession.activities
      .slice(0, currentActivityIndex + 1)
      .filter((item) => item.exerciseId === currentActivity.exerciseId).length -
    1;
  const templateSeries = program.sessions.filter(
    (session) => session.templateId === currentSession.templateId,
  );
  const currentSeriesIndex = templateSeries.findIndex(
    (session) => session.sessionId === currentSession.sessionId,
  );
  if (currentSeriesIndex < 0) return emptyInsights;

  return emptyInsights.map((setInsights) => {
    const setIndex = setInsights.setNumber - 1;
    const points = templateSeries.map<ExerciseSetInsightPoint>((session) => {
      const current = session.sessionId === currentSession.sessionId;
      const activity = session.activities.filter(
        (item) => item.exerciseId === currentActivity.exerciseId,
      )[exerciseOccurrence];
      const workoutSet = activity
        ? setInsights.setType === "Main"
          ? activity.mainSets[setIndex]
          : activity.warmupSets[setIndex]
        : undefined;
      const completed = workoutSet?.status === "Done";
      const notStarted = current && workoutSet?.status === "Planned";
      const actualReps = workoutSet?.actualReps ?? 0;
      const reps =
        !workoutSet || workoutSet.status === "Incomplete"
          ? 0
          : current
            ? actualReps > 0
              ? actualReps
              : Math.max(activity?.reps ?? 0, 0)
            : workoutSet.status === "Done" && actualReps > 0
              ? actualReps
              : 0;
      const weight =
        workoutSet?.weight ??
        (current && activity && workoutSet
          ? plannedWeightForWorkoutSet(activity, workoutSet, exercise.oneRepMax)
          : undefined);
      const weightLbs = weight
        ? weight.unit === "kg"
          ? kilogramsToPounds(weight.value)
          : weight.value
        : 0;
      const date = [
        workoutSet?.start,
        workoutSet?.end,
        session.start,
        session.end,
        current ? now : undefined,
      ].find(isValidDate);

      return {
        sessionId: session.sessionId,
        date,
        reps,
        weightLbs,
        volumeLbs: reps * weightLbs,
        feedback: reps > 0 ? workoutSet?.feedback : undefined,
        current,
        completed,
        notStarted,
      };
    });

    return { ...setInsights, points };
  });
};

export const plannedRepsFromTemplateActivity = (activity: Activity) => {
  const actualReps = activity.mainSets.reduce(
    (result, mainSet) => {
      if (
        mainSet.status === "Done" &&
        mainSet.actualReps != null &&
        mainSet.actualReps > 0
      ) {
        result.total += mainSet.actualReps;
        result.count += 1;
      }
      return result;
    },
    { total: 0, count: 0 },
  );

  if (!actualReps.count) return activity.reps;

  return Math.ceil(actualReps.total / actualReps.count);
};

export const plannedSessionFromTemplate = (
  template: Session,
  createId: () => string,
): Pick<
  Session,
  "name" | "deload" | "start" | "end" | "status" | "activities"
> => ({
  name: template.name,
  deload: false,
  start: undefined,
  end: undefined,
  status: "Planned",
  activities: template.activities.map((activity) => ({
    ...activity,
    activityId: createId(),
    reps: plannedRepsFromTemplateActivity(activity),
    warmupSets: activity.warmupSets.map((warmupSet) => ({
      workoutSetId: createId(),
      type: "Warmup",
      status: "Planned",
      start: undefined,
      end: undefined,
      weight: activity.load.type === "RPE" ? warmupSet.weight : undefined,
      actualReps: 0,
      feedback: "Neutral",
    })),
    mainSets: activity.mainSets.map((mainSet) => ({
      workoutSetId: createId(),
      type: "Main",
      status: "Planned",
      start: undefined,
      end: undefined,
      weight: activity.load.type === "RPE" ? mainSet.weight : undefined,
      actualReps: 0,
      feedback: "Neutral",
    })),
  })),
});

const getTemplateSeries = (sessions: readonly Session[], session: Session) =>
  session.templateId
    ? sessions.filter((item) => item.templateId === session.templateId)
    : [];

const orderSessionsChronologically = (
  sessions: readonly Session[],
  allSessions: readonly Session[],
) =>
  sessions
    .map((session) => ({
      session,
      index: allSessions.findIndex(
        (item) => item.sessionId === session.sessionId,
      ),
    }))
    .sort((a, b) => {
      const aTime = (a.session.start ?? a.session.end)?.getTime() ?? 0;
      const bTime = (b.session.start ?? b.session.end)?.getTime() ?? 0;
      return aTime - bTime || a.index - b.index;
    })
    .map(({ session }) => session);

export const canSetSessionDeload = (
  sessions: readonly Session[],
  session: Session,
) => {
  const sessionIndex = sessions.findIndex(
    (item) => item.sessionId === session.sessionId,
  );
  if (!session.templateId || sessionIndex < 0) return false;

  return sessions
    .slice(0, sessionIndex)
    .some((item) => item.templateId === session.templateId);
};

const getCompletedTemplateSeries = (
  sessions: readonly Session[],
  session: Session,
) =>
  orderSessionsChronologically(
    getTemplateSeries(sessions, session).filter(
      (item) => item.status === "Done",
    ),
    sessions,
  );

const getPreviousCompletedNonDeloadSession = (
  sessions: readonly Session[],
  session: Session,
) => {
  const completedSeries = getCompletedTemplateSeries(sessions, session);
  const sessionIndex = completedSeries.findIndex(
    (item) => item.sessionId === session.sessionId,
  );
  if (sessionIndex < 1) return undefined;

  return completedSeries
    .slice(0, sessionIndex)
    .reverse()
    .find((item) => !item.deload);
};

export const isLatestCompletedSessionInTemplateSeries = (
  sessions: readonly Session[],
  session: Session,
) =>
  session.status === "Done" &&
  getCompletedTemplateSeries(sessions, session).at(-1)?.sessionId ===
    session.sessionId;

export const templateSessionForPlanning = (
  sessions: readonly Session[],
  selectedSession: Session,
) => {
  return (
    [...getCompletedTemplateSeries(sessions, selectedSession)]
      .reverse()
      .find((session) => !session.deload) ?? selectedSession
  );
};

export const plannedSessionVolumeLbs = (
  session: Session,
  exercises: readonly Exercise[],
) => {
  const exercisesById = new Map(
    exercises.map((exercise) => [exercise.exerciseId, exercise]),
  );

  return session.activities.reduce((sessionVolume, activity) => {
    const exercise = exercisesById.get(activity.exerciseId);
    const reps = plannedRepsFromTemplateActivity(activity);
    const weightMultiplier = exercise?.loadKind === "WEIGHT_PAIR" ? 2 : 1;
    const percentWeight =
      activity.load.type === "PERCENT" && (exercise?.oneRepMax?.value ?? 0) > 0
        ? {
            value: round5(
              (exercise?.oneRepMax?.value ?? 0) * activity.load.value,
            ),
            unit: exercise?.oneRepMax?.unit ?? ("lbs" as const),
          }
        : undefined;
    const activityVolume = activity.mainSets.reduce((volume, mainSet) => {
      const weight =
        activity.load.type === "PERCENT" ? percentWeight : mainSet.weight;
      const weightLbs = weight
        ? weight.unit === "kg"
          ? kilogramsToPounds(weight.value)
          : weight.value
        : 0;

      return volume + reps * weightLbs * weightMultiplier;
    }, 0);

    return sessionVolume + activityVolume;
  }, 0);
};

const completedSetHasHigherLoadWithLowerVolume = (
  currentSet: MainSet,
  previousSet: MainSet,
) => {
  const currentReps = currentSet.actualReps ?? 0;
  const previousReps = previousSet.actualReps ?? 0;
  if (
    currentSet.status !== "Done" ||
    previousSet.status !== "Done" ||
    currentReps <= 0 ||
    previousReps <= 0 ||
    !currentSet.weight ||
    !previousSet.weight
  ) {
    return false;
  }

  const currentWeightLbs =
    currentSet.weight.unit === "kg"
      ? kilogramsToPounds(currentSet.weight.value)
      : currentSet.weight.value;
  const previousWeightLbs =
    previousSet.weight.unit === "kg"
      ? kilogramsToPounds(previousSet.weight.value)
      : previousSet.weight.value;

  return (
    currentWeightLbs > previousWeightLbs &&
    currentReps < previousReps &&
    currentWeightLbs * currentReps < previousWeightLbs * previousReps
  );
};

const plannedMainSetVolumeLbs = (
  activity: Activity,
  mainSet: MainSet,
  exercise?: Exercise,
) => {
  const weight =
    activity.load.type === "PERCENT" && (exercise?.oneRepMax?.value ?? 0) > 0
      ? {
          value: round5(
            (exercise?.oneRepMax?.value ?? 0) * activity.load.value,
          ),
          unit: exercise?.oneRepMax?.unit ?? ("lbs" as const),
        }
      : mainSet.weight;
  const weightLbs = weight
    ? weight.unit === "kg"
      ? kilogramsToPounds(weight.value)
      : weight.value
    : 0;
  const weightMultiplier = exercise?.loadKind === "WEIGHT_PAIR" ? 2 : 1;

  return (
    plannedRepsFromTemplateActivity(activity) * weightLbs * weightMultiplier
  );
};

const deloadDetectionVolumeLbs = (
  session: Session,
  previousSession: Session,
  exercises: readonly Exercise[],
) => {
  const exercisesById = new Map(
    exercises.map((exercise) => [exercise.exerciseId, exercise]),
  );

  return session.activities.reduce((sessionVolume, activity, activityIndex) => {
    const exercise = exercisesById.get(activity.exerciseId);
    const exerciseOccurrence =
      session.activities
        .slice(0, activityIndex + 1)
        .filter((item) => item.exerciseId === activity.exerciseId).length - 1;
    const previousActivity = previousSession.activities.filter(
      (item) => item.exerciseId === activity.exerciseId,
    )[exerciseOccurrence];

    return (
      sessionVolume +
      activity.mainSets.reduce((activityVolume, mainSet, mainSetIndex) => {
        const plannedVolume = plannedMainSetVolumeLbs(
          activity,
          mainSet,
          exercise,
        );
        const previousSet = previousActivity?.mainSets[mainSetIndex];
        const progressionCredit =
          previousSet &&
          completedSetHasHigherLoadWithLowerVolume(mainSet, previousSet)
            ? plannedMainSetVolumeLbs(previousActivity, previousSet, exercise)
            : 0;

        return activityVolume + Math.max(plannedVolume, progressionCredit);
      }, 0)
    );
  }, 0);
};

export const isDeloadCandidate = (
  sessions: readonly Session[],
  session: Session,
  exercises: readonly Exercise[],
) => {
  if (session.status !== "Done" || !canSetSessionDeload(sessions, session)) {
    return false;
  }

  const previousSession = getPreviousCompletedNonDeloadSession(
    sessions,
    session,
  );
  if (!previousSession) return false;

  const previousVolume = plannedSessionVolumeLbs(previousSession, exercises);
  if (previousVolume <= 0) return false;

  return (
    deloadDetectionVolumeLbs(session, previousSession, exercises) <=
    previousVolume * 0.75
  );
};

export const dateRegex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;

export const normalizedLocalDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const weekAndDayNumbersFromStart = (start: Date, end: Date) => {
  const daysDiff = differenceInCalendarDays(
    normalizedLocalDate(end),
    normalizedLocalDate(start),
  );
  const week = Math.floor(daysDiff / 7) + 1;
  const day = (daysDiff % 7) + 1;

  return { week, day };
};

export const weekAndDayFromStart = (start: Date, end: Date) => {
  const { week, day } = weekAndDayNumbersFromStart(start, end);
  return `${week > 1 ? `Week ${week}, ` : ""}Day ${day}`;
};

export const buildProgramInsights = (
  program: Program,
  exercises: readonly Exercise[],
  now = new Date(),
): ProgramInsights => {
  const sessions = program.sessions
    .filter((session): session is Session & { start: Date } =>
      isValidDate(session.start),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const firstSession = sessions[0];

  if (!firstSession) return { muscleGroups: [], weeks: [] };

  const programStart = normalizedLocalDate(firstSession.start);
  const exercisesById = new Map(
    exercises.map((exercise) => [exercise.exerciseId, exercise]),
  );
  const muscleGroupNames = new Map<string, MuscleGroup>();
  const weeklyMuscleGroups = new Map<
    number,
    Map<string, ProgramInsightMuscleGroup>
  >();
  const currentWeek = isValidDate(now)
    ? weekAndDayNumbersFromStart(programStart, now).week
    : 0;
  let lastWeek = Math.max(currentWeek, 0);

  sessions.forEach((session) => {
    const { week } = weekAndDayNumbersFromStart(programStart, session.start);
    if (week < 1) return;
    lastWeek = Math.max(lastWeek, week);

    session.activities.forEach((activity) => {
      const exercise = exercisesById.get(activity.exerciseId);
      const muscleGroups = normalizeMuscleGroups(
        exercise?.primaryMuscles ?? [],
      );
      if (!exercise || !muscleGroups.length) return;

      const completedSets = activity.mainSets.filter(
        (workoutSet) =>
          workoutSet.status === "Done" && (workoutSet.actualReps ?? 0) > 0,
      );
      if (!completedSets.length) return;

      const weekMuscleGroups =
        weeklyMuscleGroups.get(week) ??
        new Map<string, ProgramInsightMuscleGroup>();
      weeklyMuscleGroups.set(week, weekMuscleGroups);

      muscleGroups.forEach((muscleGroup) => {
        const muscleGroupKey = muscleGroup.toLocaleLowerCase();
        const canonicalName =
          muscleGroupNames.get(muscleGroupKey) ?? muscleGroup;
        muscleGroupNames.set(muscleGroupKey, canonicalName);

        const metrics = weekMuscleGroups.get(muscleGroupKey) ?? {
          muscleGroup: canonicalName,
          sets: 0,
          reps: 0,
          volumeLbs: 0,
          hardSets: 0,
          easySets: 0,
        };

        completedSets.forEach((workoutSet) => {
          const reps = workoutSet.actualReps ?? 0;
          const weight = workoutSet.weight;
          const weightLbs = weight
            ? weight.unit === "kg"
              ? kilogramsToPounds(weight.value)
              : weight.value
            : 0;
          const weightMultiplier = exercise.loadKind === "WEIGHT_PAIR" ? 2 : 1;

          metrics.sets += 1;
          metrics.reps += reps;
          metrics.volumeLbs += reps * weightLbs * weightMultiplier;
          metrics.hardSets += workoutSet.feedback === "Hard" ? 1 : 0;
          metrics.easySets += workoutSet.feedback === "Easy" ? 1 : 0;
        });

        weekMuscleGroups.set(muscleGroupKey, metrics);
      });
    });
  });

  const weeks = Array.from({ length: lastWeek }, (_, index) => {
    const week = index + 1;
    const start = addDays(programStart, index * 7);
    const muscleGroups = Array.from(
      weeklyMuscleGroups.get(week)?.values() ?? [],
    ).sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup));

    return {
      week,
      start,
      end: addDays(start, 6),
      muscleGroups,
    };
  });

  return {
    muscleGroups: Array.from(muscleGroupNames.values()).sort((a, b) =>
      a.localeCompare(b),
    ),
    weeks,
  };
};

export const stringifyPercent = (value: number) =>
  `${Number(value.toFixed(2))}%`;

export const stringifyLoad = ({ type, value }: Load) =>
  type === "PERCENT" ? stringifyPercent(value * 100) : `RPE ${value}`;

export const stringifyWeight = (weight: Weight) =>
  `${weight.value} ${weight.unit}`;

export const sortRecordsByName = (rows: { name: string }[]) =>
  rows.sort((a, b) => a.name.localeCompare(b.name));

export const normalizeExerciseName = (name: string) =>
  name.trim().replace(/\s+/g, "").toLocaleLowerCase();

export const normalizeSingleLineText = (text: string) =>
  text.trim().replace(/\s+/g, " ");

export const exerciseNamesMatch = (a: string, b: string) =>
  normalizeExerciseName(a) === normalizeExerciseName(b);

export const sumPlateWeights = (plateWeights: number[]) =>
  plateWeights.reduce((total, p) => total + p, 0);
