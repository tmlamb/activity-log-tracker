import { weekAndDayNumbersFromStart } from "@activity-log/ui/utils";

import type { Db } from "../database/db";
import type {
  ProgramWeek,
  SessionSummary,
  TimelineAnchor,
  TimelineDateCount,
} from "../domain/program-timeline";
import { programWeekWindow } from "../domain/program-timeline";

export function getProgramHeader(
  reader: Db,
  programId: string,
): { id: string; name: string } | null {
  return reader.getFirstSync(
    "SELECT id, name FROM programs WHERE id = ?",
    programId,
  );
}

function getTimelineAnchor(
  reader: Db,
  programId: string,
): TimelineAnchor | null {
  return reader.getFirstSync<TimelineAnchor>(
    `SELECT p.id AS programId, COUNT(s.id) AS sessionCount,
       MIN(s.start_ms) AS earliestStartMs
     FROM programs p LEFT JOIN sessions s ON s.program_id = p.id
     WHERE p.id = ? GROUP BY p.id`,
    programId,
  );
}

/** Metadata scans session dates only; it never reads activities or sets. */
export function readProgramTimeline(reader: Db, programId: string) {
  const anchor = getTimelineAnchor(reader, programId);
  if (!anchor) return null;
  const dates = reader.getAllSync<TimelineDateCount>(
    `SELECT status, CASE WHEN status = 'Planned' THEN NULL ELSE start_ms END AS startMs,
       COUNT(*) AS count FROM sessions WHERE program_id = ?
     GROUP BY status, CASE WHEN status = 'Planned' THEN NULL ELSE start_ms END`,
    programId,
  );
  return { anchor, dates };
}

type SummaryRow = Omit<SessionSummary, "deload" | "day"> & { deload: number };

/**
 * Read one local-calendar week. Planned sessions precede Ready sessions, then
 * terminal sessions. Equal dates keep the legacy reverse-position tie break.
 * The current week also lists planned and undated sessions.
 */
export function getProgramWeek(
  db: Db,
  programId: string,
  week: number,
  nowMs: number,
): ProgramWeek | null {
  const anchor = getTimelineAnchor(db, programId);
  if (!anchor) return null;
  const window = programWeekWindow(anchor, week, nowMs);
  const rows = db.getAllSync<SummaryRow>(
    `SELECT id, name, lineage_id AS lineageId, status, deload,
       start_ms AS startMs, end_ms AS endMs
     FROM sessions
     WHERE program_id = ? AND (
       (status <> 'Planned' AND start_ms >= ? AND start_ms < ?)
       OR (? = 1 AND (status = 'Planned' OR start_ms IS NULL)))
     ORDER BY CASE status WHEN 'Planned' THEN 0 WHEN 'Ready' THEN 1 ELSE 2 END,
       CASE WHEN status <> 'Planned' AND start_ms IS NULL THEN 1 ELSE 0 END DESC,
       CASE WHEN status = 'Planned' THEN 0 ELSE COALESCE(start_ms, 0) END DESC,
       position DESC`,
    programId,
    window.startMs,
    window.endMs,
    Number(window.includeCurrent),
  );
  return {
    week,
    items: rows.map(({ deload, ...row }) => ({
      ...row,
      deload: deload === 1,
      day:
        row.status === "Planned"
          ? null
          : weekAndDayNumbersFromStart(
              new Date(window.programStartMs),
              new Date(row.startMs ?? nowMs),
            ).day,
    })),
  };
}
