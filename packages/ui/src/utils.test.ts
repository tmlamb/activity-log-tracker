import { describe, expect, it } from "vitest";

import type { Activity, Exercise, Program, Session, WorkoutSet } from "./utils";
import {
  buildExerciseSetInsights,
  buildProgramInsights,
  canSetSessionDeload,
  cleanupInactiveSession,
  completeSession,
  exerciseNamesMatch,
  finalizeWorkoutSet,
  isDeloadCandidate,
  isLatestCompletedSessionInTemplateSeries,
  normalizeExerciseName,
  normalizeMuscleGroups,
  normalizeSingleLineText,
  plannedRepsFromTemplateActivity,
  plannedSessionFromTemplate,
  plannedSessionVolumeLbs,
  reconcileCompletedWorkoutSet,
  shiftSessionStart,
  stringifyLoad,
  stringifyPercent,
  templateSessionForPlanning,
  weekAndDayFromStart,
} from "./utils";

const createWorkoutSet = (
  workoutSetId: string,
  overrides: Partial<WorkoutSet> = {},
): WorkoutSet => ({
  workoutSetId,
  type: "Main",
  status: "Planned",
  feedback: "Neutral",
  ...overrides,
});

const createActivity = (
  mainSets: WorkoutSet[],
  warmupSets: WorkoutSet[] = [],
): Activity => ({
  activityId: "activity-1",
  exerciseId: "exercise-1",
  reps: 10,
  rest: 2,
  load: { type: "RPE", value: 8 },
  mainSets: mainSets.map((workoutSet) => ({
    ...workoutSet,
    type: "Main",
  })),
  warmupSets: warmupSets.map((workoutSet) => ({
    ...workoutSet,
    type: "Warmup",
  })),
});

const createSession = (
  activity: Activity,
  overrides: Partial<Session> = {},
): Session => ({
  name: "Session",
  sessionId: "session-1",
  deload: false,
  start: new Date("2026-08-24T08:00:00.000Z"),
  status: "Ready",
  activities: [activity],
  ...overrides,
});

describe("normalizeExerciseName", () => {
  it("should normalize case and whitespace", () => {
    expect(normalizeExerciseName("  Bench  Press ")).toBe("benchpress");
  });
});

describe("normalizeSingleLineText", () => {
  it("should collapse whitespace into a single space", () => {
    expect(normalizeSingleLineText("  Upper\n\nBody\tDay  ")).toBe(
      "Upper Body Day",
    );
  });
});

describe("normalizeMuscleGroups", () => {
  it("keeps arbitrary names while removing empty and duplicate entries", () => {
    expect(
      normalizeMuscleGroups(["  Abductors ", "Back", "back", "", null]),
    ).toEqual(["Abductors", "Back"]);
  });
});

describe("exerciseNamesMatch", () => {
  it("should match names that differ by case or whitespace", () => {
    expect(exerciseNamesMatch("Bench Press", "benchpress")).toBe(true);
    expect(exerciseNamesMatch("Bench Press", " BENCH  PRESS ")).toBe(true);
  });

  it("should not match different exercise names", () => {
    expect(exerciseNamesMatch("Bench Press", "Squat")).toBe(false);
  });
});

describe("stringifyPercent", () => {
  it("should trim trailing zeroes", () => {
    expect(stringifyPercent(75)).toBe("75%");
    expect(stringifyPercent(75.5)).toBe("75.5%");
    expect(stringifyPercent(75.25)).toBe("75.25%");
  });
});

describe("stringifyLoad", () => {
  it("should trim trailing zeroes from percent loads", () => {
    expect(stringifyLoad({ type: "PERCENT", value: 0.75 })).toBe("75%");
    expect(stringifyLoad({ type: "PERCENT", value: 0.755 })).toBe("75.5%");
  });
});

describe("plannedRepsFromTemplateActivity", () => {
  it("averages only completed main sets with positive reps", () => {
    const activity = createActivity([
      createWorkoutSet("done-1", { status: "Done", actualReps: 8 }),
      createWorkoutSet("incomplete", {
        status: "Incomplete",
        actualReps: 100,
      }),
      createWorkoutSet("done-2", { status: "Done", actualReps: 11 }),
    ]);

    expect(plannedRepsFromTemplateActivity(activity)).toBe(10);
  });
});

describe("plannedSessionFromTemplate", () => {
  it("resets difficulty when creating planned sets from a template", () => {
    const template = createSession(
      createActivity(
        [
          createWorkoutSet("main", {
            status: "Done",
            actualReps: 8,
            weight: { value: 50, unit: "lbs" },
            feedback: "Hard",
          }),
        ],
        [
          createWorkoutSet("warmup", {
            status: "Done",
            actualReps: 10,
            weight: { value: 20, unit: "lbs" },
            feedback: "Easy",
          }),
        ],
      ),
    );
    const ids = ["new-activity", "new-warmup", "new-main"];
    let idIndex = 0;

    const result = plannedSessionFromTemplate(
      template,
      () => ids[idIndex++] ?? "unexpected-id",
    );

    expect(result).toMatchObject({
      name: template.name,
      deload: false,
      start: undefined,
      end: undefined,
      status: "Planned",
      activities: [
        {
          activityId: "new-activity",
          reps: 8,
          warmupSets: [
            {
              workoutSetId: "new-warmup",
              status: "Planned",
              actualReps: 0,
              feedback: "Neutral",
              weight: { value: 20, unit: "lbs" },
            },
          ],
          mainSets: [
            {
              workoutSetId: "new-main",
              status: "Planned",
              actualReps: 0,
              feedback: "Neutral",
              weight: { value: 50, unit: "lbs" },
            },
          ],
        },
      ],
    });
  });
});

describe("template series deloads", () => {
  const exercise: Exercise = {
    exerciseId: "exercise-1",
    name: "Barbell Squat",
    loadKind: "BARBELL",
  };
  const completedActivity = (reps: number, weight = 100) =>
    createActivity([
      createWorkoutSet("main-1", {
        status: "Done",
        actualReps: reps,
        weight: { value: weight, unit: "lbs" },
      }),
      createWorkoutSet("main-2", {
        status: "Done",
        actualReps: reps,
        weight: { value: weight, unit: "lbs" },
      }),
      createWorkoutSet("main-3", {
        status: "Done",
        actualReps: reps,
        weight: { value: weight, unit: "lbs" },
      }),
    ]);
  const completedSession = (
    sessionId: string,
    day: number,
    activity = completedActivity(10),
    overrides: Partial<Session> = {},
  ) =>
    createSession(activity, {
      sessionId,
      templateId: "series-1",
      status: "Done",
      start: new Date(`2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`),
      end: new Date(`2026-08-${String(day).padStart(2, "0")}T09:00:00.000Z`),
      ...overrides,
    });

  it("only allows sessions after the first series member to be deloads", () => {
    const first = completedSession("first", 1);
    const second = completedSession("second", 2);
    const standalone = createSession(completedActivity(10), {
      sessionId: "standalone",
      status: "Done",
    });

    expect(canSetSessionDeload([first, second], first)).toBe(false);
    expect(canSetSessionDeload([first, second], second)).toBe(true);
    expect(canSetSessionDeload([standalone], standalone)).toBe(false);
  });

  it("plans from the last completed non-deload session after consecutive deloads", () => {
    const first = completedSession("first", 1);
    const firstDeload = completedSession("first-deload", 2, undefined, {
      deload: true,
    });
    const latestDeload = completedSession("latest-deload", 3, undefined, {
      deload: true,
    });
    const sessions = [first, firstDeload, latestDeload];

    expect(templateSessionForPlanning(sessions, latestDeload)).toBe(first);
    expect(
      isLatestCompletedSessionInTemplateSeries(sessions, latestDeload),
    ).toBe(true);
    expect(
      isLatestCompletedSessionInTemplateSeries(sessions, firstDeload),
    ).toBe(false);
  });

  it("keeps using the selected session when the latest completion is not a deload", () => {
    const first = completedSession("first", 1);
    const latest = completedSession("latest", 2);

    expect(templateSessionForPlanning([first, latest], latest)).toBe(latest);
  });

  it("ignores a more recent incomplete session when planning from a template", () => {
    const first = completedSession("first", 1);
    const latestCompleted = completedSession("latest-completed", 2);
    const incomplete = completedSession("incomplete", 3, undefined, {
      status: "Incomplete",
    });

    expect(
      templateSessionForPlanning(
        [first, latestCompleted, incomplete],
        incomplete,
      ),
    ).toBe(latestCompleted);
  });

  it("projects incomplete sets using metrics from the completed sets", () => {
    const previous = completedSession("previous", 1);
    const current = completedSession(
      "current",
      2,
      createActivity([
        createWorkoutSet("done", {
          status: "Done",
          actualReps: 10,
          weight: { value: 100, unit: "lbs" },
        }),
        createWorkoutSet("incomplete-1", {
          status: "Incomplete",
          weight: { value: 100, unit: "lbs" },
        }),
        createWorkoutSet("incomplete-2", {
          status: "Incomplete",
          weight: { value: 100, unit: "lbs" },
        }),
      ]),
    );

    expect(plannedSessionVolumeLbs(current, [exercise])).toBe(3000);
    expect(isDeloadCandidate([previous, current], current, [exercise])).toBe(
      false,
    );
  });

  it("identifies completed sessions at or below 75 percent projected volume", () => {
    const previous = completedSession("previous", 1);
    const atThreshold = completedSession(
      "at-threshold",
      2,
      completedActivity(10, 75),
    );
    const belowThreshold = completedSession(
      "below-threshold",
      3,
      completedActivity(5, 75),
    );

    expect(
      isDeloadCandidate([previous, atThreshold], atThreshold, [exercise]),
    ).toBe(true);
    expect(
      isDeloadCandidate(
        [previous, atThreshold, belowThreshold],
        belowThreshold,
        [exercise],
      ),
    ).toBe(true);
  });

  it("does not identify lower-volume higher-load progression as a deload", () => {
    const previous = completedSession("previous", 1, completedActivity(15, 35));
    const current = completedSession("current", 2, completedActivity(8, 40));

    expect(plannedSessionVolumeLbs(previous, [exercise])).toBe(1575);
    expect(plannedSessionVolumeLbs(current, [exercise])).toBe(960);
    expect(isDeloadCandidate([previous, current], current, [exercise])).toBe(
      false,
    );
  });

  it("does not identify an incomplete session", () => {
    const previous = completedSession("previous", 1);
    const incomplete = completedSession("incomplete", 2, completedActivity(1), {
      status: "Incomplete",
    });

    expect(
      isDeloadCandidate([previous, incomplete], incomplete, [exercise]),
    ).toBe(false);
  });

  it("uses planned percentage weight and paired-weight volume", () => {
    const percentageActivity = {
      ...createActivity([
        createWorkoutSet("main-1"),
        createWorkoutSet("main-2"),
      ]),
      load: { type: "PERCENT" as const, value: 0.5 },
    };
    const session = createSession(percentageActivity);
    const pairedExercise: Exercise = {
      exerciseId: "exercise-1",
      name: "Dumbbell Squat",
      loadKind: "WEIGHT_PAIR",
      oneRepMax: { value: 200, unit: "lbs" },
    };

    expect(plannedSessionVolumeLbs(session, [pairedExercise])).toBe(4000);
  });
});

describe("cleanupInactiveSession", () => {
  it("marks a timed-out session incomplete when every set was completed", () => {
    const lastActivityAt = new Date("2026-08-24T09:00:00.000Z");
    const session = createSession(
      createActivity([
        createWorkoutSet("done", {
          status: "Done",
          actualReps: 10,
          end: lastActivityAt,
        }),
      ]),
      { lastActivityAt },
    );

    const result = cleanupInactiveSession(
      session,
      new Date("2026-08-24T10:00:00.000Z"),
    );

    expect(result.status).toBe("Incomplete");
    expect(result.end).toEqual(lastActivityAt);
    expect(result.activities[0]?.mainSets[0]?.status).toBe("Done");
  });

  it("marks a session incomplete after one hour without a write", () => {
    const lastActivityAt = new Date("2026-08-24T09:00:00.000Z");
    const readySetStart = new Date("2026-08-24T08:30:00.000Z");
    const session = createSession(
      createActivity([
        createWorkoutSet("done", {
          status: "Done",
          actualReps: 10,
          end: new Date("2026-08-24T08:25:00.000Z"),
        }),
        createWorkoutSet("ready", {
          status: "Ready",
          start: readySetStart,
          actualReps: 9,
        }),
        createWorkoutSet("planned"),
      ]),
      { lastActivityAt },
    );

    const result = cleanupInactiveSession(
      session,
      new Date("2026-08-24T10:00:00.000Z"),
    );

    expect(result.status).toBe("Incomplete");
    expect(result.end).toEqual(lastActivityAt);
    expect(result.activities[0]?.mainSets).toMatchObject([
      { status: "Done" },
      { status: "Done", end: lastActivityAt },
      { status: "Incomplete" },
    ]);
    expect(result.activities[0]?.mainSets[2]?.end).toBeUndefined();
  });

  it("leaves a recently active session unchanged", () => {
    const session = createSession(createActivity([]), {
      lastActivityAt: new Date("2026-08-24T09:00:01.000Z"),
    });

    expect(
      cleanupInactiveSession(session, new Date("2026-08-24T10:00:00.000Z")),
    ).toBe(session);
  });

  it("immediately completes a legacy session at its latest set completion", () => {
    const latestSetEnd = new Date("2026-08-24T09:15:00.000Z");
    const session = createSession(
      createActivity([
        createWorkoutSet("done-1", {
          status: "Done",
          end: new Date("2026-08-24T08:30:00.000Z"),
        }),
        createWorkoutSet("done-2", {
          status: "Done",
          end: latestSetEnd,
        }),
        createWorkoutSet("planned"),
      ]),
    );

    const result = cleanupInactiveSession(
      session,
      new Date("2026-08-24T10:00:00.000Z"),
    );

    expect(result.status).toBe("Incomplete");
    expect(result.end).toEqual(latestSetEnd);
  });

  it("clips a legacy set start that is later than the fallback end", () => {
    const latestSetEnd = new Date("2026-08-24T09:00:00.000Z");
    const session = createSession(
      createActivity([
        createWorkoutSet("done", {
          status: "Done",
          end: latestSetEnd,
        }),
        createWorkoutSet("ready", {
          status: "Ready",
          start: new Date("2026-08-24T09:30:00.000Z"),
        }),
      ]),
    );

    const result = cleanupInactiveSession(
      session,
      new Date("2026-08-24T10:00:00.000Z"),
    );
    const readySet = result.activities[0]?.mainSets[1];

    expect(result.end).toEqual(latestSetEnd);
    expect(readySet).toMatchObject({
      status: "Incomplete",
      start: latestSetEnd,
      end: latestSetEnd,
    });
  });

  it("uses a 60 minute duration for a legacy session without completed sets", () => {
    const session = createSession(
      createActivity([createWorkoutSet("planned")]),
    );

    const result = cleanupInactiveSession(
      session,
      new Date("2026-08-25T10:00:00.000Z"),
    );

    expect(result.status).toBe("Incomplete");
    expect(result.end).toEqual(new Date("2026-08-24T09:00:00.000Z"));
  });

  it("does not change planned or terminal sessions", () => {
    const activity = createActivity([]);
    const planned = createSession(activity, { status: "Planned" });
    const incomplete = createSession(activity, { status: "Incomplete" });
    const done = createSession(activity, { status: "Done" });

    expect(cleanupInactiveSession(planned)).toBe(planned);
    expect(cleanupInactiveSession(incomplete)).toBe(incomplete);
    expect(cleanupInactiveSession(done)).toBe(done);
  });
});

describe("completeSession", () => {
  it("completes unfinished sets with reps and marks only missing reps incomplete", () => {
    const end = new Date("2026-08-24T09:00:00.000Z");
    const session = createSession(
      createActivity([
        createWorkoutSet("ready", {
          status: "Ready",
          start: new Date("2026-08-24T08:30:00.000Z"),
          actualReps: 10,
        }),
        createWorkoutSet("planned-with-reps", { actualReps: 8 }),
        createWorkoutSet("planned-without-reps"),
      ]),
    );

    const result = completeSession(session, end);

    expect(result.status).toBe("Done");
    expect(result.end).toEqual(end);
    expect(result.activities[0]?.mainSets).toMatchObject([
      { status: "Done", end },
      { status: "Done", start: end, end },
      { status: "Incomplete" },
    ]);
    expect(result.activities[0]?.mainSets[2]?.start).toBeUndefined();
    expect(result.activities[0]?.mainSets[2]?.end).toBeUndefined();
  });

  it("acknowledges an incomplete session without changing its end time", () => {
    const end = new Date("2026-08-24T09:00:00.000Z");
    const session = createSession(
      createActivity([
        createWorkoutSet("incomplete", { status: "Incomplete" }),
      ]),
      { status: "Incomplete", end },
    );

    const result = completeSession(session, end);

    expect(result.status).toBe("Done");
    expect(result.end).toEqual(end);
    expect(result.activities[0]?.mainSets[0]?.status).toBe("Incomplete");
  });
});

describe("shiftSessionStart", () => {
  it("preserves session and set offsets while leaving edit recency unchanged", () => {
    const originalStart = new Date("2026-08-24T08:00:00.000Z");
    const originalEnd = new Date("2026-08-24T09:30:00.000Z");
    const lastActivityAt = new Date("2026-08-29T12:00:00.000Z");
    const warmupStart = new Date("2026-08-24T08:05:00.000Z");
    const warmupEnd = new Date("2026-08-24T08:10:00.000Z");
    const mainStart = new Date("2026-08-24T08:20:00.000Z");
    const mainEnd = new Date("2026-08-24T08:30:00.000Z");
    const session = createSession(
      createActivity(
        [
          createWorkoutSet("main", {
            status: "Incomplete",
            start: mainStart,
            end: mainEnd,
          }),
          createWorkoutSet("missing-times", { status: "Incomplete" }),
        ],
        [
          createWorkoutSet("warmup", {
            status: "Done",
            start: warmupStart,
            end: warmupEnd,
          }),
        ],
      ),
      {
        start: originalStart,
        end: originalEnd,
        lastActivityAt,
        status: "Done",
      },
    );
    const nextStart = new Date("2026-09-07T18:45:00.000Z");

    const shifted = shiftSessionStart(session, nextStart);
    const shiftedWarmup = shifted.activities[0]?.warmupSets[0];
    const shiftedMain = shifted.activities[0]?.mainSets[0];
    const shiftedMissingTimes = shifted.activities[0]?.mainSets[1];

    expect(shifted.start).toEqual(nextStart);
    expect(shifted.end?.getTime()).toBe(
      nextStart.getTime() + originalEnd.getTime() - originalStart.getTime(),
    );
    expect(shiftedWarmup?.start?.getTime()).toBe(
      nextStart.getTime() + warmupStart.getTime() - originalStart.getTime(),
    );
    expect(shiftedWarmup?.end?.getTime()).toBe(
      nextStart.getTime() + warmupEnd.getTime() - originalStart.getTime(),
    );
    expect(shiftedMain?.start?.getTime()).toBe(
      nextStart.getTime() + mainStart.getTime() - originalStart.getTime(),
    );
    expect(shiftedMain?.end?.getTime()).toBe(
      nextStart.getTime() + mainEnd.getTime() - originalStart.getTime(),
    );
    expect(shiftedMissingTimes?.start).toBeUndefined();
    expect(shiftedMissingTimes?.end).toBeUndefined();
    expect(shifted.lastActivityAt).toBe(lastActivityAt);
    expect(session.start).toBe(originalStart);
  });
});

describe("finalizeWorkoutSet", () => {
  it("completes a previously incomplete set without extending its end time", () => {
    const sessionEnd = new Date("2026-08-24T09:00:00.000Z");
    const workoutSet = createWorkoutSet("incomplete", {
      status: "Incomplete",
      start: new Date("2026-08-24T08:50:00.000Z"),
      end: sessionEnd,
      actualReps: 10,
    });

    const result = finalizeWorkoutSet(workoutSet, sessionEnd);

    expect(result.status).toBe("Done");
    expect(result.end).toEqual(sessionEnd);
  });

  it("marks a done set incomplete if its reps were cleared", () => {
    const sessionEnd = new Date("2026-08-24T09:00:00.000Z");
    const workoutSet = createWorkoutSet("done", {
      status: "Done",
      actualReps: 0,
      end: sessionEnd,
    });

    const result = finalizeWorkoutSet(workoutSet, sessionEnd);

    expect(result.status).toBe("Incomplete");
    expect(result.end).toEqual(sessionEnd);
  });
});

describe("reconcileCompletedWorkoutSet", () => {
  it("completes an incomplete set when reps are entered", () => {
    const sessionEnd = new Date("2026-08-24T09:00:00.000Z");
    const workoutSet = createWorkoutSet("incomplete", {
      status: "Incomplete",
      end: sessionEnd,
    });

    const result = reconcileCompletedWorkoutSet(workoutSet, 10, sessionEnd);

    expect(result).toMatchObject({
      actualReps: 10,
      status: "Done",
      start: sessionEnd,
      end: sessionEnd,
    });
  });

  it("returns a corrected set to incomplete when reps are zero", () => {
    const sessionEnd = new Date("2026-08-24T09:00:00.000Z");
    const workoutSet = createWorkoutSet("done", {
      status: "Done",
      actualReps: 10,
      start: new Date("2026-08-24T08:50:00.000Z"),
      end: sessionEnd,
    });

    const result = reconcileCompletedWorkoutSet(workoutSet, 0, sessionEnd);

    expect(result).toMatchObject({
      actualReps: 0,
      status: "Incomplete",
      start: workoutSet.start,
      end: sessionEnd,
    });
  });
});

describe("weekAndDayFromStart", () => {
  it("should consider two equal dates to be day 1", () => {
    const startDate = new Date(2022, 6, 7, 5, 5, 5);
    const endDate = new Date(2022, 6, 7, 5, 5, 5);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Day 1");
  });

  it("should consider two dates on the same day at different times to be day 1", () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1);
    const endDate = new Date(2022, 6, 7, 23, 59, 59);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Day 1");
  });

  it("should return 0 if the end date is before the start date", () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1);
    const endDate = new Date(2022, 6, 6, 23, 59, 59);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Day 0");
  });

  it("should consider it to be day 2 when the clock reaches midnight", () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1);
    const endDate = new Date(2022, 6, 8, 0, 0, 0);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Day 2");
  });

  it("should consider it to be day 7 when the seventh day is reached", () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1);
    const endDate = new Date(2022, 6, 13, 0, 0, 0);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Day 7");
  });

  it("should consider it to be week 2 day 1 when the eighth day is reached", () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1);
    const endDate = new Date(2022, 6, 14, 0, 0, 0);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Week 2, Day 1");
  });

  it("should consider it to be week 15 day 6 when the 111th day is reached", () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1);
    const endDate = new Date(2022, 9, 18, 0, 0, 0);
    const result = weekAndDayFromStart(startDate, endDate);
    expect(result).toBe("Week 15, Day 6");
  });
});

describe("buildExerciseSetInsights", () => {
  const exercise: Exercise = {
    exerciseId: "exercise-1",
    name: "Bench Press",
    loadKind: "BARBELL",
    oneRepMax: { value: 200, unit: "lbs" },
  };

  it("compares the same set position across the complete template series", () => {
    const sessions = Array.from({ length: 6 }, (_, index) => {
      const current = index === 3;
      const activity = {
        ...createActivity([
          createWorkoutSet(`first-${index}`, {
            status: current ? "Planned" : "Done",
            actualReps: current ? 0 : 20,
            weight: current ? undefined : { value: 50, unit: "lbs" },
          }),
          createWorkoutSet(`second-${index}`, {
            status: current ? "Planned" : "Done",
            actualReps: current ? 0 : index + 5,
            weight: current ? undefined : { value: 100, unit: "lbs" },
            feedback: current ? "Hard" : "Easy",
          }),
        ]),
        activityId: `activity-${index}`,
        reps: 12,
        load: current
          ? ({ type: "PERCENT", value: 0.5 } as const)
          : ({ type: "RPE", value: 8 } as const),
      };

      return createSession(activity, {
        sessionId: `session-${index}`,
        templateId: "template-1",
        status: current ? "Planned" : "Done",
        start: current ? undefined : new Date(2026, 7, 20 + index, 8),
      });
    });
    const currentSession = sessions[3];
    const currentActivity = currentSession?.activities[0];
    const currentSet = currentActivity?.mainSets[1];
    if (!currentSession || !currentActivity || !currentSet) {
      throw new Error("Expected current set fixture");
    }

    const result = buildExerciseSetInsights(
      { name: "Program", programId: "program-1", sessions },
      currentSession,
      currentActivity,
      currentSet,
      exercise,
      new Date(2026, 7, 27, 8),
    );

    expect(result).toMatchObject({ setType: "Main", setNumber: 2 });
    expect(result.points.map((point) => point.sessionId)).toEqual([
      "session-0",
      "session-1",
      "session-2",
      "session-3",
      "session-4",
      "session-5",
    ]);
    expect(result.points[0]).toMatchObject({
      reps: 5,
      weightLbs: 100,
      volumeLbs: 500,
      feedback: "Easy",
      current: false,
    });
    expect(result.points[3]).toMatchObject({
      date: new Date(2026, 7, 27, 8),
      reps: 12,
      weightLbs: 100,
      volumeLbs: 1200,
      feedback: "Hard",
      current: true,
    });
    expect(result.points[5]).toMatchObject({
      reps: 10,
      weightLbs: 100,
      volumeLbs: 1000,
      feedback: "Easy",
      current: false,
    });
  });

  it("keeps zero bars for missing, incomplete, and zero-rep historical sets", () => {
    const matchingActivity = (
      activityId: string,
      secondSet?: Partial<WorkoutSet>,
    ) => ({
      ...createActivity([
        createWorkoutSet(`first-${activityId}`, {
          status: "Done",
          actualReps: 10,
          weight: { value: 50, unit: "lbs" },
        }),
        ...(secondSet
          ? [createWorkoutSet(`second-${activityId}`, secondSet)]
          : []),
      ]),
      activityId,
      reps: 8,
    });
    const sessions = [
      createSession(
        matchingActivity("valid", {
          status: "Done",
          actualReps: 5,
          weight: { value: 10, unit: "kg" },
        }),
        {
          sessionId: "valid",
          templateId: "template-1",
          status: "Done",
          start: new Date(2026, 7, 23, 8),
        },
      ),
      createSession(matchingActivity("missing"), {
        sessionId: "missing",
        templateId: "template-1",
        status: "Done",
        start: new Date(2026, 7, 24, 8),
      }),
      createSession(
        matchingActivity("incomplete", {
          status: "Incomplete",
          actualReps: 10,
          weight: { value: 100, unit: "lbs" },
        }),
        {
          sessionId: "incomplete",
          templateId: "template-1",
          status: "Incomplete",
          start: new Date(2026, 7, 25, 8),
        },
      ),
      createSession(
        matchingActivity("zero-reps", {
          status: "Done",
          actualReps: 0,
          weight: { value: 100, unit: "lbs" },
        }),
        {
          sessionId: "zero-reps",
          templateId: "template-1",
          status: "Done",
          start: new Date(2026, 7, 26, 8),
        },
      ),
      createSession(
        matchingActivity("current", {
          status: "Ready",
          actualReps: 6,
          weight: { value: 100, unit: "lbs" },
        }),
        {
          sessionId: "current",
          templateId: "template-1",
          status: "Ready",
          start: new Date(2026, 7, 27, 8),
        },
      ),
    ];
    const currentSession = sessions[4];
    const currentActivity = currentSession?.activities[0];
    const currentSet = currentActivity?.mainSets[1];
    if (!currentSession || !currentActivity || !currentSet) {
      throw new Error("Expected current set fixture");
    }

    const result = buildExerciseSetInsights(
      { name: "Program", programId: "program-1", sessions },
      currentSession,
      currentActivity,
      currentSet,
      exercise,
    );

    expect(result.points[0]?.weightLbs).toBeCloseTo(22.046226218);
    expect(result.points[0]?.volumeLbs).toBeCloseTo(110.23113109);
    expect(result.points.slice(1, 4).map((point) => point.volumeLbs)).toEqual([
      0, 0, 0,
    ]);
    expect(result.points[4]).toMatchObject({
      reps: 6,
      weightLbs: 100,
      volumeLbs: 600,
      current: true,
    });
  });
});

describe("buildProgramInsights", () => {
  it("aggregates completed main sets by week and primary muscle", () => {
    const exercises: Exercise[] = [
      {
        exerciseId: "exercise-1",
        name: "Dumbbell Press",
        loadKind: "WEIGHT_PAIR",
        primaryMuscles: ["Chest", "Triceps"],
      },
      {
        exerciseId: "exercise-2",
        name: "Row",
        loadKind: "BARBELL",
        primaryMuscles: ["Back"],
      },
    ];
    const weekOneActivity = createActivity(
      [
        createWorkoutSet("hard", {
          status: "Done",
          actualReps: 10,
          weight: { value: 20, unit: "lbs" },
          feedback: "Hard",
        }),
        createWorkoutSet("easy", {
          status: "Done",
          actualReps: 8,
          weight: { value: 10, unit: "kg" },
          feedback: "Easy",
        }),
        createWorkoutSet("incomplete", {
          status: "Incomplete",
          actualReps: 100,
          weight: { value: 100, unit: "lbs" },
          feedback: "Hard",
        }),
      ],
      [
        createWorkoutSet("warmup", {
          status: "Done",
          actualReps: 20,
          weight: { value: 5, unit: "lbs" },
          feedback: "Easy",
        }),
      ],
    );
    const weekThreeActivity = {
      ...createActivity([
        createWorkoutSet("neutral", {
          status: "Done",
          actualReps: 5,
          weight: { value: 50, unit: "lbs" },
          feedback: "Neutral",
        }),
      ]),
      exerciseId: "exercise-2",
    };
    const program: Program = {
      name: "Strength",
      programId: "program-1",
      sessions: [
        createSession(weekOneActivity, {
          start: new Date(2026, 7, 24, 8),
        }),
        createSession(weekThreeActivity, {
          sessionId: "session-2",
          start: new Date(2026, 8, 7, 8),
        }),
      ],
    };

    const result = buildProgramInsights(
      program,
      exercises,
      new Date(2026, 8, 7),
    );

    expect(result.muscleGroups).toEqual(["Back", "Chest", "Triceps"]);
    expect(result.weeks).toHaveLength(3);
    expect(result.weeks[1]?.muscleGroups).toEqual([]);
    expect(result.weeks[0]?.muscleGroups[0]).toMatchObject({
      muscleGroup: "Chest",
      sets: 2,
      reps: 18,
      hardSets: 1,
      easySets: 1,
    });
    expect(result.weeks[0]?.muscleGroups[0]?.volumeLbs).toBeCloseTo(
      400 + 8 * 10 * 2.2046226218 * 2,
    );
    expect(result.weeks[0]?.muscleGroups[1]).toEqual(
      result.weeks[0]?.muscleGroups[0]
        ? {
            ...result.weeks[0].muscleGroups[0],
            muscleGroup: "Triceps",
          }
        : undefined,
    );
    expect(result.weeks[2]?.muscleGroups).toEqual([
      {
        muscleGroup: "Back",
        sets: 1,
        reps: 5,
        volumeLbs: 250,
        hardSets: 0,
        easySets: 0,
      },
    ]);
  });

  it("ignores sets that cannot be assigned to a muscle group", () => {
    const program: Program = {
      name: "Strength",
      programId: "program-1",
      sessions: [
        createSession(
          createActivity([
            createWorkoutSet("done", {
              status: "Done",
              actualReps: 10,
            }),
          ]),
          { start: new Date(2026, 7, 24, 8) },
        ),
      ],
    };

    expect(
      buildProgramInsights(program, [], new Date(2026, 7, 24, 12)),
    ).toEqual({
      muscleGroups: [],
      weeks: [
        {
          week: 1,
          start: new Date(2026, 7, 24),
          end: new Date(2026, 7, 30),
          muscleGroups: [],
        },
      ],
    });
  });

  it("includes inactive weeks through the current program week", () => {
    const program: Program = {
      name: "Strength",
      programId: "program-1",
      sessions: [
        createSession(createActivity([]), {
          start: new Date(2026, 7, 24, 8),
        }),
      ],
    };

    const result = buildProgramInsights(program, [], new Date(2026, 8, 14, 8));

    expect(result.weeks).toHaveLength(4);
    expect(result.weeks[3]).toMatchObject({ week: 4, muscleGroups: [] });
  });

  it("returns no program weeks when sessions have not started", () => {
    const program: Program = {
      name: "Strength",
      programId: "program-1",
      sessions: [
        createSession(createActivity([]), {
          start: undefined,
          status: "Planned",
        }),
      ],
    };

    expect(buildProgramInsights(program, [])).toEqual({
      muscleGroups: [],
      weeks: [],
    });
  });
});
