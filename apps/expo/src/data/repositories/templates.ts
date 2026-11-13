interface TemplateReader {
  getFirstAsync<T>(sql: string, ...parameters: string[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...parameters: string[]): Promise<T[]>;
}

export interface TemplateChoice {
  sessionId: string;
  name: string;
  lineageId: string | null;
  startMs: number | null;
  endMs: number | null;
  revision: number;
}

/** One most recent terminal session per lineage, without loading sets. */
export async function listTemplateChoices(
  reader: TemplateReader,
  programId: string,
): Promise<TemplateChoice[]> {
  return reader.getAllAsync<TemplateChoice>(
    `WITH ranked AS (
       SELECT id AS sessionId, name, lineage_id AS lineageId, start_ms AS startMs,
         end_ms AS endMs, revision, position,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(lineage_id, id)
           ORDER BY start_ms DESC, position ASC
         ) AS rank
       FROM sessions WHERE program_id = ? AND status IN ('Done', 'Incomplete') AND end_ms IS NOT NULL
     )
     SELECT sessionId, name, lineageId, startMs, endMs, revision
     FROM ranked WHERE rank = 1 ORDER BY startMs ASC, position DESC`,
    programId,
  );
}

/** Resolve a choice to an existing plan or the latest non-deload lineage source. */
export async function resolveTemplateChoice(
  reader: TemplateReader,
  programId: string,
  selectedSessionId: string,
): Promise<{ kind: "planned" | "template"; sessionId: string } | null> {
  const selected = await reader.getFirstAsync<{ lineageId: string | null }>(
    "SELECT lineage_id AS lineageId FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    selectedSessionId,
  );
  if (!selected) return null;
  const planned = await reader.getFirstAsync<{ id: string }>(
    `SELECT id FROM sessions WHERE program_id = ? AND status = 'Planned'
       AND COALESCE(lineage_id, id) = ? ORDER BY position LIMIT 1`,
    programId,
    selected.lineageId ?? selectedSessionId,
  );
  if (planned) return { kind: "planned", sessionId: planned.id };
  if (selected.lineageId === null)
    return { kind: "template", sessionId: selectedSessionId };
  const source = await reader.getFirstAsync<{ id: string }>(
    `SELECT id FROM sessions WHERE program_id = ? AND lineage_id = ?
       AND status IN ('Done', 'Incomplete') AND deload = 0
     ORDER BY COALESCE(start_ms, end_ms, 0) DESC, position DESC LIMIT 1`,
    programId,
    selected.lineageId,
  );
  return { kind: "template", sessionId: source?.id ?? selectedSessionId };
}
