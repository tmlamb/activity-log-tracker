import { weekAndDayNumbersFromStart } from "@activity-log/ui/utils";

import type {
  ProgramWeekPage,
  ProgramWeekRequest,
  SessionSummary,
  TimelineAnchor,
  TimelineDateCount,
} from "../domain/program-timeline";
import { programWeekWindow } from "../domain/program-timeline";

interface TimelineReader {
  getFirstAsync<T>(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<T | null>;
  getAllAsync<T>(sql: string, ...parameters: (string | number)[]): Promise<T[]>;
}

export async function getProgramHeader(
  reader: TimelineReader,
  programId: string,
): Promise<{ id: string; name: string } | null> {
  return reader.getFirstAsync(
    "SELECT id, name FROM programs WHERE id = ?",
    programId,
  );
}

async function getTimelineAnchor(
  reader: TimelineReader,
  programId: string,
): Promise<TimelineAnchor | null> {
  return reader.getFirstAsync<TimelineAnchor>(
    `SELECT p.id AS programId, COUNT(s.id) AS sessionCount,
       MIN(s.start_ms) AS earliestStartMs
     FROM programs p LEFT JOIN sessions s ON s.program_id = p.id
     WHERE p.id = ? GROUP BY p.id`,
    programId,
  );
}

/** Metadata scans session dates only; it never reads activities or sets. */
export async function readProgramTimeline(
  reader: TimelineReader,
  programId: string,
) {
  const anchor = await getTimelineAnchor(reader, programId);
  if (!anchor) return null;
  const dates = await reader.getAllAsync<TimelineDateCount>(
    `SELECT status, CASE WHEN status = 'Planned' THEN NULL ELSE start_ms END AS startMs,
       COUNT(*) AS count FROM sessions WHERE program_id = ?
     GROUP BY status, CASE WHEN status = 'Planned' THEN NULL ELSE start_ms END`,
    programId,
  );
  return { anchor, dates };
}

type SummaryRow = Omit<SessionSummary, "deload" | "day"> & {
  deload: number;
  position: number;
  displayGroup: number;
  undated: number;
  sortStartMs: number;
};

/**
 * Read one local-calendar week with keyset pagination and a hard row limit.
 * Planned sessions precede Ready sessions, then terminal sessions. Equal dates
 * retain the legacy reverse-position tie break, including undated records.
 * Call inside one read transaction so the anchor and page share a snapshot.
 */
export async function getProgramWeekPage(
  reader: TimelineReader,
  programId: string,
  request: ProgramWeekRequest,
): Promise<ProgramWeekPage | null> {
  const anchor = await getTimelineAnchor(reader, programId);
  if (!anchor) return null;
  const context = programWeekWindow(anchor, request);
  const after = request.after;
  const rows = await reader.getAllAsync<SummaryRow>(
    `WITH candidates AS (
       SELECT * FROM sessions WHERE program_id = ? AND status <> 'Planned'
         AND start_ms >= ? AND start_ms < ?
       UNION ALL
       SELECT * FROM sessions WHERE program_id = ? AND ? = 1
         AND status <> 'Planned' AND start_ms IS NULL
       UNION ALL
       SELECT * FROM sessions WHERE program_id = ? AND ? = 1 AND status = 'Planned'
     ), ordered AS (
       SELECT id, name, lineage_id AS lineageId, status, deload, start_ms AS startMs,
         end_ms AS endMs, position,
         CASE status WHEN 'Planned' THEN 0 WHEN 'Ready' THEN 1 ELSE 2 END AS displayGroup,
         CASE WHEN status <> 'Planned' AND start_ms IS NULL THEN 1 ELSE 0 END AS undated,
         CASE WHEN status = 'Planned' THEN 0 ELSE COALESCE(start_ms, 0) END AS sortStartMs
       FROM candidates
     )
     SELECT * FROM ordered
     WHERE ? = 0 OR displayGroup > ?
       OR (displayGroup = ? AND undated < ?)
       OR (displayGroup = ? AND undated = ? AND sortStartMs < ?)
       OR (displayGroup = ? AND undated = ? AND sortStartMs = ? AND position < ?)
     ORDER BY displayGroup, undated DESC, sortStartMs DESC, position DESC LIMIT ?`,
    programId,
    context.startMs,
    context.endMs,
    programId,
    Number(context.includeCurrent),
    programId,
    Number(context.includeCurrent),
    Number(after !== undefined),
    after?.group ?? 0,
    after?.group ?? 0,
    after?.undated ?? 0,
    after?.group ?? 0,
    after?.undated ?? 0,
    after?.sortStartMs ?? 0,
    after?.group ?? 0,
    after?.undated ?? 0,
    after?.sortStartMs ?? 0,
    after?.position ?? 0,
    context.limit + 1,
  );
  const page = rows.slice(0, context.limit);
  const last = page.at(-1);
  return {
    week: request.week,
    items: page.map(
      ({
        position: _position,
        displayGroup: _group,
        undated: _undated,
        sortStartMs: _sort,
        deload,
        ...row
      }) => ({
        ...row,
        deload: deload === 1,
        day:
          row.status === "Planned"
            ? null
            : weekAndDayNumbersFromStart(
                new Date(context.programStartMs),
                new Date(row.startMs ?? request.nowMs),
              ).day,
      }),
    ),
    nextCursor:
      rows.length > context.limit && last
        ? {
            programStartMs: context.programStartMs,
            currentWeek: context.currentWeek,
            week: request.week,
            windowStartMs: context.startMs,
            windowEndMs: context.endMs,
            group: last.displayGroup,
            undated: last.undated,
            sortStartMs: last.sortStartMs,
            position: last.position,
          }
        : null,
  };
}
