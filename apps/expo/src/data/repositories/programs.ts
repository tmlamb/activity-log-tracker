import { count, eq, sql } from "drizzle-orm";

import { normalizeSingleLineText } from "@activity-log/ui/utils";

import type { DrizzleTransactionExecutor } from "../database/drizzle-transaction";
import { programs, sessions } from "../database/drizzle-schema";
import { drizzleTransaction } from "../database/drizzle-transaction";

export interface ProgramSummary {
  id: string;
  name: string;
  sessionCount: number;
}

/** Read only program headers and counts; never materialize session graphs. */
export async function listProgramSummaries(
  transaction: DrizzleTransactionExecutor,
): Promise<ProgramSummary[]> {
  return drizzleTransaction(transaction)
    .select({
      id: programs.id,
      name: programs.name,
      sessionCount: count(sessions.id).as("sessionCount"),
    })
    .from(programs)
    .leftJoin(sessions, eq(sessions.programId, programs.id))
    .groupBy(programs.id, programs.name, programs.position)
    .orderBy(programs.position)
    .all();
}

/** All mutations must be called inside the application writer transaction. */
export async function createProgram(
  transaction: DrizzleTransactionExecutor,
  id: string,
  name: string,
) {
  await drizzleTransaction(transaction)
    .insert(programs)
    .values({
      id,
      name: normalizeSingleLineText(name),
      position: sql`(SELECT COALESCE(MAX(position) + 1, 0) FROM programs)`,
    })
    .run();
}

export async function renameProgram(
  transaction: DrizzleTransactionExecutor,
  id: string,
  name: string,
) {
  const result = await drizzleTransaction(transaction)
    .update(programs)
    .set({ name: normalizeSingleLineText(name) })
    .where(eq(programs.id, id))
    .returning({ id: programs.id })
    .all();
  if (result.length === 0) throw new Error("Program not found");
}

export async function deleteProgram(
  transaction: DrizzleTransactionExecutor,
  id: string,
) {
  const result = await drizzleTransaction(transaction)
    .delete(programs)
    .where(eq(programs.id, id))
    .returning({ id: programs.id })
    .all();
  if (result.length === 0) throw new Error("Program not found");
}
