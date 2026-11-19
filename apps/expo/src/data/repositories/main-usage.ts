import type { Db } from "../database/db";

/** How many recent lineage sessions decide which exercise is planned as main. */
export const MAIN_USAGE_SESSION_COUNT = 5;

/**
 * Count, per exercise, how many of the source's most recent finished lineage
 * sessions planned it as a main activity. Planning picks the most used
 * exercise among each activity and its alternatives.
 */
export function getRecentMainUsage(
  reader: Db,
  programId: string,
  sourceSessionId: string,
): Map<string, number> {
  const rows = reader.getAllSync<{ exerciseId: string; count: number }>(
    `WITH recent AS (
       SELECT s.id FROM sessions s
       JOIN sessions source ON source.program_id = s.program_id AND source.id = ?
       WHERE s.program_id = ? AND COALESCE(s.lineage_id, s.id) = COALESCE(source.lineage_id, source.id)
         AND s.status IN ('Done', 'Incomplete')
       ORDER BY COALESCE(s.start_ms, s.end_ms, 0) DESC, s.position DESC
       LIMIT ?
     )
     SELECT a.exercise_id AS exerciseId, COUNT(DISTINCT a.session_id) AS count
     FROM activities a JOIN recent ON recent.id = a.session_id
     WHERE a.program_id = ? AND a.parent_activity_id IS NULL AND a.exercise_id IS NOT NULL
     GROUP BY a.exercise_id`,
    sourceSessionId,
    programId,
    MAIN_USAGE_SESSION_COUNT,
    programId,
  );
  return new Map(rows.map((row) => [row.exerciseId, row.count]));
}
