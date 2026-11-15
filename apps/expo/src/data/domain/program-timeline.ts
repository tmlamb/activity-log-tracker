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

export interface ProgramWeek {
  week: number;
  items: SessionSummary[];
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
  week: number,
  nowMs: number,
) {
  const context = timelineContext(anchor, nowMs);
  const start = addDays(
    startOfDay(new Date(context.programStartMs)),
    (week - 1) * 7,
  );
  return {
    ...context,
    includeCurrent: week === context.currentWeek,
    startMs: start.getTime(),
    endMs: addDays(start, 7).getTime(),
  };
}
