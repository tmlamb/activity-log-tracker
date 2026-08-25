import { describe, expect, it } from "vitest";

import type { Activity, Session, WorkoutSet } from "./utils";
import {
  cleanupInactiveSession,
  completeSession,
  exerciseNamesMatch,
  finalizeWorkoutSet,
  normalizeExerciseName,
  plannedRepsFromTemplateActivity,
  reconcileCompletedWorkoutSet,
  stringifyLoad,
  stringifyPercent,
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
