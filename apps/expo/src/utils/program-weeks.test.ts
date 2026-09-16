import { describe, expect, it } from "vitest";

import type { Session } from "@activity-log/ui/utils";

import { buildProgramWeeks } from "./program-weeks";

const localDate = (day: number) => new Date(2026, 0, day, 12);

const createSession = (
  sessionId: string,
  status: Session["status"],
  start?: Date,
): Session => ({
  name: sessionId,
  sessionId,
  deload: false,
  start,
  status,
  activities: [],
});

describe("buildProgramWeeks", () => {
  it("groups sessions without changing their established display order", () => {
    const sessions = [
      createSession("done-day-6", "Done", localDate(6)),
      createSession("planned-old", "Planned"),
      createSession("ready-day-4", "Ready", localDate(4)),
      createSession("done-day-2", "Done", localDate(2)),
      createSession("planned-new", "Planned"),
      createSession("incomplete-day-7", "Incomplete", localDate(7)),
      createSession("program-start", "Done", localDate(1)),
      createSession("ready-current", "Ready", localDate(15)),
      createSession("done-week-2", "Done", localDate(10)),
    ];
    const originalOrder = sessions.map((session) => session.sessionId);

    const result = buildProgramWeeks(sessions, localDate(20));

    expect(result.programStart).toEqual(localDate(1));
    expect(result.currentWeek).toBe(3);
    expect(result.weeks.map(({ week }) => week)).toEqual([3, 2, 1]);
    expect(
      result.weeks[0]?.sessions.map((session) => session.sessionId),
    ).toEqual(["planned-new", "planned-old", "ready-current"]);
    expect(
      result.weeks[1]?.sessions.map((session) => session.sessionId),
    ).toEqual(["done-week-2"]);
    expect(
      result.weeks[2]?.sessions.map((session) => session.sessionId),
    ).toEqual([
      "ready-day-4",
      "incomplete-day-7",
      "done-day-6",
      "done-day-2",
      "program-start",
    ]);
    expect(sessions.map((session) => session.sessionId)).toEqual(originalOrder);
  });

  it("creates an empty current week for a program without sessions", () => {
    const now = localDate(20);

    expect(buildProgramWeeks([], now)).toEqual({
      currentWeek: 1,
      programStart: now,
      weeks: [{ week: 1, sessions: [] }],
    });
  });
});
