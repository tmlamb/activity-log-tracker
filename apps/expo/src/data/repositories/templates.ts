import type { Db } from "../database/db";

export interface TemplateChoice {
  sessionId: string;
  name: string;
  lineageId: string | null;
  startMs: number | null;
  endMs: number | null;
  revision: number;
  /** The lineage has a started, unfinished session; planning must wait for it. */
  inProgress: boolean;
}

/**
 * One most recent terminal session per lineage, without loading sets, least
 * recently performed first. Lineages whose next session is already planned or
 * in progress come last. Each says whether its lineage has one in progress.
 */
export function listTemplateChoices(
  reader: Db,
  programId: string,
): TemplateChoice[] {
  return reader
    .getAllSync<Omit<TemplateChoice, "inProgress"> & { inProgress: number }>(
      `WITH ranked AS (
       SELECT id AS sessionId, name, lineage_id AS lineageId, start_ms AS startMs,
         end_ms AS endMs, revision, position,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(lineage_id, id)
           ORDER BY start_ms DESC, position ASC
         ) AS rank
       FROM sessions WHERE program_id = ? AND status IN ('Done', 'Incomplete') AND end_ms IS NOT NULL
     )
     SELECT sessionId, name, lineageId, startMs, endMs, revision,
       EXISTS(SELECT 1 FROM sessions active WHERE active.program_id = ?
         AND active.lineage_id = ranked.lineageId AND active.status = 'Ready') AS inProgress
     FROM ranked WHERE rank = 1
     ORDER BY EXISTS(SELECT 1 FROM sessions upcoming WHERE upcoming.program_id = ?
       AND upcoming.lineage_id = ranked.lineageId AND upcoming.status IN ('Planned', 'Ready')),
       startMs ASC, position DESC`,
      programId,
      programId,
      programId,
    )
    .map((choice) => ({ ...choice, inProgress: choice.inProgress === 1 }));
}

/** Resolve a choice to an existing plan or the latest non-deload lineage source. */
export function resolveTemplateChoice(
  reader: Db,
  programId: string,
  selectedSessionId: string,
): { kind: "planned" | "template"; sessionId: string } | null {
  const selected = reader.getFirstSync<{ lineageId: string | null }>(
    "SELECT lineage_id AS lineageId FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    selectedSessionId,
  );
  if (!selected) return null;
  const planned = reader.getFirstSync<{ id: string }>(
    `SELECT id FROM sessions WHERE program_id = ? AND status = 'Planned'
       AND COALESCE(lineage_id, id) = ? ORDER BY position LIMIT 1`,
    programId,
    selected.lineageId ?? selectedSessionId,
  );
  if (planned) return { kind: "planned", sessionId: planned.id };
  if (selected.lineageId === null)
    return { kind: "template", sessionId: selectedSessionId };
  const source = reader.getFirstSync<{ id: string }>(
    `SELECT id FROM sessions WHERE program_id = ? AND lineage_id = ?
       AND status IN ('Done', 'Incomplete') AND deload = 0
     ORDER BY COALESCE(start_ms, end_ms, 0) DESC, position DESC LIMIT 1`,
    programId,
    selected.lineageId,
  );
  return { kind: "template", sessionId: source?.id ?? selectedSessionId };
}
