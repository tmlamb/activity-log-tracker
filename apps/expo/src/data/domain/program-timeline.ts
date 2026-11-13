import { addDays, startOfDay } from "date-fns";

import { weekAndDayNumbersFromStart } from "@activity-log/ui/utils";

type Status = "Planned" | "Ready" | "Done" | "Incomplete";

export interface TimelineAnchor {
  programId: string;
  sessionCount: number;
  earliestStartMs: number | null;
}

export interface TimelineDateCount {
  status: Status;
  startMs: number | null;
  count: number;
}

export interface ProgramOverview {
  programId: string;
  sessionCount: number;
  programStartMs: number;
  currentWeek: number;
  weeks: { week: number; sessionCount: number }[];
}

export interface SessionSummary {
  id: string;
  name: string;
  lineageId: string | null;
  status: Status;
  deload: boolean;
  startMs: number | null;
  endMs: number | null;
  day: number | null;
}

export interface TimelineCursor {
  programStartMs: number;
  currentWeek: number;
  week: number;
  windowStartMs: number;
  windowEndMs: number;
  group: number;
  undated: number;
  sortStartMs: number;
  position: number;
}

export interface ProgramWeekRequest {
  week: number;
  nowMs: number;
  limit?: number;
  after?: TimelineCursor;
}

export interface ProgramWeekPage {
  week: number;
  items: SessionSummary[];
  nextCursor: TimelineCursor | null;
}

export function timelineContext(anchor: TimelineAnchor, nowMs: number) {
  const now = new Date(nowMs);
  if (!Number.isFinite(now.getTime()))
    throw new Error("A valid timeline clock is required.");
  const programStartMs = anchor.earliestStartMs ?? startOfDay(now).getTime();
  const programStart = new Date(programStartMs);
  return {
    programStartMs,
    currentWeek: weekAndDayNumbersFromStart(programStart, now).week,
  };
}

/** Format compact date/count facts after the read transaction has finished. */
export function buildProgramOverview(
  anchor: TimelineAnchor,
  dates: TimelineDateCount[],
  nowMs: number,
): ProgramOverview {
  const context = timelineContext(anchor, nowMs);
  const counts = new Map<number, number>([[context.currentWeek, 0]]);
  for (const date of dates) {
    const week =
      date.status === "Planned"
        ? context.currentWeek
        : weekAndDayNumbersFromStart(
            new Date(context.programStartMs),
            new Date(date.startMs ?? nowMs),
          ).week;
    counts.set(week, (counts.get(week) ?? 0) + date.count);
  }
  return {
    programId: anchor.programId,
    sessionCount: anchor.sessionCount,
    ...context,
    weeks: [...counts]
      .map(([week, sessionCount]) => ({ week, sessionCount }))
      .sort((a, b) => b.week - a.week),
  };
}

/** Local-calendar boundaries deliberately use calendar days, not 24-hour spans. */
export function programWeekWindow(
  anchor: TimelineAnchor,
  request: ProgramWeekRequest,
) {
  const { week, nowMs, after } = request;
  const limit = request.limit ?? 50;
  if (!Number.isSafeInteger(week)) throw new Error("Invalid program week.");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Timeline page size must be between 1 and 100.");
  const context = timelineContext(anchor, nowMs);
  const start = addDays(
    startOfDay(new Date(context.programStartMs)),
    (week - 1) * 7,
  );
  const end = addDays(start, 7);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
    throw new Error("Invalid program week.");
  if (after) {
    if (
      after.programStartMs !== context.programStartMs ||
      after.currentWeek !== context.currentWeek ||
      after.week !== week ||
      after.windowStartMs !== start.getTime() ||
      after.windowEndMs !== end.getTime()
    ) {
      throw new Error("The timeline changed. Reload before loading more.");
    }
    if (
      ![0, 1, 2].includes(after.group) ||
      ![0, 1].includes(after.undated) ||
      !Number.isFinite(after.sortStartMs) ||
      !Number.isSafeInteger(after.position) ||
      after.position < 0
    ) {
      throw new Error("Invalid timeline cursor.");
    }
  }
  return {
    ...context,
    week,
    limit,
    includeCurrent: week === context.currentWeek,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}
