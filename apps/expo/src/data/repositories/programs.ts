import { normalizeSingleLineText } from "@activity-log/ui/utils";

import type { Db } from "../database/db";

export interface ProgramSummary {
  id: string;
  name: string;
  sessionCount: number;
}

export function listProgramSummaries(db: Db): ProgramSummary[] {
  return db.getAllSync<ProgramSummary>(
    `SELECT p.id, p.name, COUNT(s.id) AS sessionCount
     FROM programs p LEFT JOIN sessions s ON s.program_id = p.id
     GROUP BY p.id ORDER BY p.position`,
  );
}

export function createProgram(db: Db, id: string, name: string) {
  db.runSync(
    `INSERT INTO programs(id, name, position)
     VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM programs))`,
    id,
    normalizeSingleLineText(name),
  );
}

export function renameProgram(db: Db, id: string, name: string) {
  const { changes } = db.runSync(
    "UPDATE programs SET name = ? WHERE id = ?",
    normalizeSingleLineText(name),
    id,
  );
  if (changes === 0) throw new Error("Program not found");
}

export function deleteProgram(db: Db, id: string) {
  const { changes } = db.runSync("DELETE FROM programs WHERE id = ?", id);
  if (changes === 0) throw new Error("Program not found");
}
