import { afterEach, describe, expect, it } from "vitest";

import type { Session } from "@activity-log/ui/utils";

import { buildProgramWeeks } from "../../utils/program-weeks";
import { createTestDb } from "../database/test-db";
import {
  buildProgramOverview,
  programWeekWindow,
} from "../domain/program-timeline";
import {
  getProgramHeader,
  getProgramWeek,
  readProgramTimeline,
} from "./program-timeline";

const databases: ReturnType<typeof createTestDb>[] = [];
afterEach(() =>
  databases.splice(0).forEach((database) => database.raw.close()),
);

const localDate = (day: number, hour = 12) => new Date(2026, 0, day, hour);
const nowMs = localDate(20).getTime();

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);`);
  databases.push(db);
  const insert = (
    id: string,
    position: number,
    status: Session["status"],
    start?: Date,
    programId = "p",
  ): Session => {
    db.raw
      .prepare(
        `INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
      VALUES (?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(programId, id, id, position, status, start?.getTime() ?? null);
    return {
      sessionId: id,
      name: id,
      status,
      start,
      deload: false,
      activities: [],
    };
  };
  return { db, reader: db, insert };
}

describe("program timeline projections", () => {
  it("matches legacy week grouping and display order across weeks, ties, and missing dates", () => {
    const { reader, insert } = setup();
    const sessions = [
      insert("done-day-6", 0, "Done", localDate(6)),
      insert("planned-old", 1, "Planned"),
      insert("ready-day-4", 2, "Ready", localDate(4)),
      insert("done-day-2", 3, "Done", localDate(2)),
      insert("planned-new", 4, "Planned", localDate(2)),
      insert("incomplete-day-7", 5, "Incomplete", localDate(7)),
      insert("program-start", 6, "Done", localDate(1)),
      insert("ready-current", 7, "Ready", localDate(15)),
      insert("done-week-2", 8, "Done", localDate(10)),
      insert("done-week-2-tie", 9, "Done", localDate(10)),
      insert("undated-done", 10, "Done"),
      insert("undated-ready", 11, "Ready"),
      insert("future", 12, "Done", localDate(27)),
    ];
    insert("program-start", 0, "Done", localDate(-30), "other");
    const legacy = buildProgramWeeks(sessions, new Date(nowMs));
    const facts = readProgramTimeline(reader, "p");
    expect(facts).not.toBeNull();
    if (!facts) throw new Error("Missing timeline facts");
    expect(buildProgramOverview(facts.anchor, facts.dates, nowMs)).toEqual({
      programId: "p",
      sessionCount: sessions.length,
      programStartMs: legacy.programStart.getTime(),
      currentWeek: legacy.currentWeek,
      weeks: legacy.weeks.map(({ week, sessions: weekSessions }) => ({
        week,
        sessionCount: weekSessions.length,
      })),
    });
    for (const week of legacy.weeks) {
      const result = getProgramWeek(reader, "p", week.week, nowMs);
      if (!result) throw new Error("Missing program week");
      expect(result.week).toBe(week.week);
      const { items } = result;
      expect(items.map(({ id }) => id)).toEqual(
        week.sessions.map(({ sessionId }) => sessionId),
      );
      expect(items.every((item) => !("activities" in item))).toBe(true);
      expect(
        items
          .filter(({ status }) => status === "Planned")
          .every(({ day }) => day === null),
      ).toBe(true);
    }
  });

  it("distinguishes missing and empty programs and keeps empty current weeks", () => {
    const { reader, insert } = setup();
    expect(getProgramHeader(reader, "p")).toEqual({
      id: "p",
      name: "Program",
    });
    expect(getProgramHeader(reader, "missing")).toBeNull();
    expect(readProgramTimeline(reader, "missing")).toBeNull();
    expect(getProgramWeek(reader, "missing", 1, nowMs)).toBeNull();
    let facts = readProgramTimeline(reader, "p");
    if (!facts) throw new Error("Missing timeline facts");
    expect(
      buildProgramOverview(facts.anchor, facts.dates, nowMs),
    ).toMatchObject({
      currentWeek: 1,
      sessionCount: 0,
      weeks: [{ week: 1, sessionCount: 0 }],
    });
    expect(getProgramWeek(reader, "p", 1, nowMs)).toEqual({
      week: 1,
      items: [],
    });
    insert("old", 0, "Done", localDate(1));
    facts = readProgramTimeline(reader, "p");
    if (!facts) throw new Error("Missing timeline facts");
    expect(
      buildProgramOverview(facts.anchor, facts.dates, nowMs).weeks,
    ).toEqual([
      { week: 3, sessionCount: 0 },
      { week: 1, sessionCount: 1 },
    ]);
  });

  it("lists an undated program in the current week while the clock advances within the same day", () => {
    const { reader, insert } = setup();
    insert("first", 0, "Planned");
    insert("second", 1, "Planned");
    for (const at of [nowMs, nowMs + 1000])
      expect(
        getProgramWeek(reader, "p", 1, at)?.items.map(({ id }) => id),
      ).toEqual(["second", "first"]);
  });

  it("uses local midnight and exclusive calendar-week ends", () => {
    const { reader, insert } = setup();
    insert("start", 0, "Done", localDate(1, 23));
    insert("before-boundary", 1, "Done", new Date(2026, 0, 7, 23, 59, 59, 999));
    insert("at-boundary", 2, "Done", localDate(8, 0));
    const page = getProgramWeek(reader, "p", 1, nowMs);
    expect(page?.items.map(({ id, day }) => ({ id, day }))).toEqual([
      { id: "before-boundary", day: 7 },
      { id: "start", day: 1 },
    ]);
    const anchor = {
      programId: "p",
      sessionCount: 3,
      earliestStartMs: new Date(2026, 2, 5, 23).getTime(),
    };
    const window = programWeekWindow(anchor, 1, nowMs);
    expect(new Date(window.startMs)).toEqual(new Date(2026, 2, 5));
    expect(new Date(window.endMs)).toEqual(new Date(2026, 2, 12));
  });

  it("returns the complete week with years of history", () => {
    const { db, reader, insert } = setup();
    insert("start", 0, "Done", localDate(1));
    db.raw
      .exec(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 1000)
      INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
        SELECT 'p', 'history-' || x, 'History', x, 'Done', 0, ${localDate(1).getTime()} + x * 86400000 FROM n;
      INSERT INTO activities(program_id, session_id, id, position)
        SELECT program_id, id, 'a', 0 FROM sessions;
      INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
        SELECT program_id, session_id, id, 'set', 'Main', 0, 'Done', 'Neutral' FROM activities;`);
    const page = getProgramWeek(reader, "p", 1, nowMs);
    expect(page?.items).toHaveLength(7);
  });
});
