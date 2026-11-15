import type { Db } from "../database/db";

export interface SessionPolicy {
  canSetDeload: boolean;
  isLatestCompletedInLineage: boolean;
}

/** Resolve lineage policy using indexed scalar lookups, without session graphs. */
export function getSessionPolicy(
  reader: Db,
  programId: string,
  sessionId: string,
): SessionPolicy | null {
  const row = reader.getFirstSync<{
    canSetDeload: number;
    isLatestCompletedInLineage: number;
  }>(
    `SELECT
       EXISTS(SELECT 1 FROM sessions previous
         WHERE previous.program_id = current.program_id
           AND previous.lineage_id = current.lineage_id
           AND previous.position < current.position) AS canSetDeload,
       CASE WHEN current.status = 'Done' AND current.lineage_id IS NOT NULL THEN
         current.id = (SELECT completed.id FROM sessions completed
           WHERE completed.program_id = current.program_id
             AND completed.lineage_id = current.lineage_id AND completed.status = 'Done'
           ORDER BY COALESCE(completed.start_ms, completed.end_ms, 0) DESC, completed.position DESC
           LIMIT 1)
       ELSE 0 END AS isLatestCompletedInLineage
     FROM sessions current WHERE current.program_id = ? AND current.id = ?`,
    programId,
    sessionId,
  );
  return row
    ? {
        canSetDeload: row.canSetDeload === 1,
        isLatestCompletedInLineage: row.isLatestCompletedInLineage === 1,
      }
    : null;
}
