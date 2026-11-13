import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import type { Session } from "@activity-log/ui/utils";

import type {
  ProgramWeekPage,
  TimelineCursor,
} from "../domain/program-timeline";
import { buildProgramWeeks } from "../../utils/program-weeks";
import { SCHEMA_V1 } from "../database/schema";
import {
  buildProgramOverview,
  programWeekWindow,
} from "../domain/program-timeline";
import {
  getProgramHeader,
  getProgramWeekPage,
  readProgramTimeline,
} from "./program-timeline";

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((database) => database.close()));

const localDate = (day: number, hour = 12) => new Date(2026, 0, day, hour);
const nowMs = localDate(20).getTime();

function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);`);
  const calls: {
    sql: string;
    parameters: (string | number)[];
    rows: number;
  }[] = [];
  const reader = {
    getFirstAsync: <T>(sql: string, ...parameters: (string | number)[]) => {
      const result = db.prepare(sql).get(...parameters) as T | undefined;
      calls.push({ sql, parameters, rows: result === undefined ? 0 : 1 });
      return Promise.resolve(result ?? null);
    },
    getAllAsync: <T>(sql: string, ...parameters: (string | number)[]) => {
      const result = db.prepare(sql).all(...parameters) as T[];
      calls.push({ sql, parameters, rows: result.length });
      return Promise.resolve(result);
    },
  };
  const insert = (
    id: string,
    position: number,
    status: Session["status"],
    start?: Date,
    programId = "p",
  ): Session => {
    db.prepare(
      `INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
      VALUES (?, ?, ?, ?, ?, 0, ?)`,
    ).run(programId, id, id, position, status, start?.getTime() ?? null);
    return {
      sessionId: id,
      name: id,
      status,
      start,
      deload: false,
      activities: [],
    };
  };
  return { db, reader, calls, insert };
}

describe("program timeline projections", () => {
  it("matches legacy week grouping and display order across bounded pages, ties, and missing dates", async () => {
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
    const facts = await readProgramTimeline(reader, "p");
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
      const items: ProgramWeekPage["items"] = [];
      let after: TimelineCursor | undefined;
      do {
        const page = await getProgramWeekPage(reader, "p", {
          week: week.week,
          nowMs,
          limit: 2,
          after,
        });
        if (!page) throw new Error("Missing program week");
        expect(page.items.length).toBeLessThanOrEqual(2);
        items.push(...page.items);
        after = page.nextCursor ?? undefined;
      } while (after);
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

  it("distinguishes missing and empty programs and keeps empty current weeks", async () => {
    const { reader, insert } = setup();
    expect(await getProgramHeader(reader, "p")).toEqual({
      id: "p",
      name: "Program",
    });
    expect(await getProgramHeader(reader, "missing")).toBeNull();
    expect(await readProgramTimeline(reader, "missing")).toBeNull();
    expect(
      await getProgramWeekPage(reader, "missing", { week: 1, nowMs }),
    ).toBeNull();
    let facts = await readProgramTimeline(reader, "p");
    if (!facts) throw new Error("Missing timeline facts");
    expect(
      buildProgramOverview(facts.anchor, facts.dates, nowMs),
    ).toMatchObject({
      currentWeek: 1,
      sessionCount: 0,
      weeks: [{ week: 1, sessionCount: 0 }],
    });
    expect(await getProgramWeekPage(reader, "p", { week: 1, nowMs })).toEqual({
      week: 1,
      items: [],
      nextCursor: null,
    });
    insert("old", 0, "Done", localDate(1));
    facts = await readProgramTimeline(reader, "p");
    if (!facts) throw new Error("Missing timeline facts");
    expect(
      buildProgramOverview(facts.anchor, facts.dates, nowMs).weeks,
    ).toEqual([
      { week: 3, sessionCount: 0 },
      { week: 1, sessionCount: 1 },
    ]);
  });

  it("rejects stale calendar/anchor cursors and invalid page sizes", async () => {
    const { reader, insert } = setup();
    insert("first", 0, "Done", localDate(1));
    insert("second", 1, "Done", localDate(2));
    const page = await getProgramWeekPage(reader, "p", {
      week: 1,
      nowMs,
      limit: 1,
    });
    const after = page?.nextCursor;
    if (!after) throw new Error("Missing next page cursor");
    await expect(
      getProgramWeekPage(reader, "p", {
        week: 2,
        nowMs,
        after,
      }),
    ).rejects.toThrow("timeline changed");
    await expect(
      getProgramWeekPage(reader, "p", {
        week: 1,
        nowMs: localDate(22).getTime(),
        after,
      }),
    ).rejects.toThrow("timeline changed");
    await expect(
      getProgramWeekPage(reader, "p", {
        week: 1,
        nowMs,
        after: { ...after, windowStartMs: after.windowStartMs + 1 },
      }),
    ).rejects.toThrow("timeline changed");
    insert("earlier", 2, "Done", localDate(-5));
    await expect(
      getProgramWeekPage(reader, "p", {
        week: 1,
        nowMs,
        after,
      }),
    ).rejects.toThrow("timeline changed");
    for (const limit of [0, -1, 101, 1.5, NaN, Infinity]) {
      await expect(
        getProgramWeekPage(reader, "p", { week: 1, nowMs, limit }),
      ).rejects.toThrow("page size");
    }
  });

  it("can page an undated program while the clock advances within the same day", async () => {
    const { reader, insert } = setup();
    insert("first", 0, "Planned");
    insert("second", 1, "Planned");
    const page = await getProgramWeekPage(reader, "p", {
      week: 1,
      nowMs,
      limit: 1,
    });
    if (!page?.nextCursor) throw new Error("Missing next page cursor");
    const next = await getProgramWeekPage(reader, "p", {
      week: 1,
      nowMs: nowMs + 1000,
      limit: 1,
      after: page.nextCursor,
    });
    expect(next?.items.map(({ id }) => id)).toEqual(["first"]);
    expect(next?.nextCursor).toBeNull();
  });

  it("uses local midnight and exclusive calendar-week ends", async () => {
    const { reader, insert } = setup();
    insert("start", 0, "Done", localDate(1, 23));
    insert("before-boundary", 1, "Done", new Date(2026, 0, 7, 23, 59, 59, 999));
    insert("at-boundary", 2, "Done", localDate(8, 0));
    const page = await getProgramWeekPage(reader, "p", { week: 1, nowMs });
    expect(page?.items.map(({ id, day }) => ({ id, day }))).toEqual([
      { id: "before-boundary", day: 7 },
      { id: "start", day: 1 },
    ]);
    const anchor = {
      programId: "p",
      sessionCount: 3,
      earliestStartMs: new Date(2026, 2, 5, 23).getTime(),
    };
    const window = programWeekWindow(anchor, { week: 1, nowMs });
    expect(new Date(window.startMs)).toEqual(new Date(2026, 2, 5));
    expect(new Date(window.endMs)).toEqual(new Date(2026, 2, 12));
  });

  it("bounds page rows and uses scoped date indexes with years of unrelated workouts", async () => {
    const { db, reader, calls, insert } = setup();
    insert("start", 0, "Done", localDate(1));
    db.exec(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 1000)
      INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
        SELECT 'p', 'history-' || x, 'History', x, 'Done', 0, ${localDate(1).getTime()} + x * 86400000 FROM n;
      INSERT INTO activities(program_id, session_id, id, position)
        SELECT program_id, id, 'a', 0 FROM sessions;
      INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
        SELECT program_id, session_id, id, 'set', 'Main', 0, 'Done', 'Neutral' FROM activities;`);
    const page = await getProgramWeekPage(reader, "p", {
      week: 1,
      nowMs,
      limit: 2,
    });
    expect(page?.items).toHaveLength(2);
    expect(calls).toHaveLength(2);
    expect(calls.map(({ rows }) => rows)).toEqual([1, 3]);
    for (const { sql } of calls) {
      expect(sql).not.toMatch(/\b(activities|workout_sets)\b/);
    }
    const pageQuery = calls[1];
    if (!pageQuery) throw new Error("Missing page query");
    const plan = db
      .prepare(`EXPLAIN QUERY PLAN ${pageQuery.sql}`)
      .all(...pageQuery.parameters) as { detail: string }[];
    expect(
      plan.some(({ detail }) =>
        /sessions_start.*start_ms>.*start_ms</.test(detail),
      ),
    ).toBe(true);
    expect(plan.some(({ detail }) => /^SCAN sessions\b/.test(detail))).toBe(
      false,
    );
  });
});
