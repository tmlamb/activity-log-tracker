import { normalizeSingleLineText } from "@activity-log/ui/utils";

interface ProgramTransaction {
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<{ changes: number }>;
}

export interface ProgramSummary {
  id: string;
  name: string;
  sessionCount: number;
}

/** Read only program headers and counts; never materialize session graphs. */
export async function listProgramSummaries(
  transaction: Pick<ProgramTransaction, "getAllAsync">,
): Promise<ProgramSummary[]> {
  return transaction.getAllAsync<ProgramSummary>(`
    SELECT p.id, p.name, COUNT(s.id) AS sessionCount
    FROM programs p LEFT JOIN sessions s ON s.program_id = p.id
    GROUP BY p.id, p.name, p.position
    ORDER BY p.position
  `);
}

/** All mutations must be called inside the application writer transaction. */
export async function createProgram(
  transaction: Pick<ProgramTransaction, "runAsync">,
  id: string,
  name: string,
) {
  await transaction.runAsync(
    `INSERT INTO programs(id, name, position)
     VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM programs))`,
    id,
    normalizeSingleLineText(name),
  );
}

export async function renameProgram(
  transaction: Pick<ProgramTransaction, "runAsync">,
  id: string,
  name: string,
) {
  const result = await transaction.runAsync(
    "UPDATE programs SET name = ? WHERE id = ?",
    normalizeSingleLineText(name),
    id,
  );
  if (result.changes === 0) throw new Error("Program not found");
}

export async function deleteProgram(
  transaction: Pick<ProgramTransaction, "runAsync">,
  id: string,
) {
  const result = await transaction.runAsync(
    "DELETE FROM programs WHERE id = ?",
    id,
  );
  if (result.changes === 0) throw new Error("Program not found");
}
