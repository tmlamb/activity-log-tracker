import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import {
  createProgram,
  deleteProgram,
  listProgramSummaries,
  renameProgram,
} from "./programs";

function adapter(db: DatabaseSync) {
  return {
    getAllAsync: <T>(sql: string) =>
      Promise.resolve(db.prepare(sql).all() as T[]),
    runAsync: (sql: string, ...parameters: (string | number)[]) => {
      const result = db.prepare(sql).run(...parameters);
      return Promise.resolve({ changes: Number(result.changes) });
    },
  };
}

describe("program repository", () => {
  it("lists counts without loading sessions and preserves order after deletion", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} BEGIN IMMEDIATE`);
      const transaction = adapter(db);
      await createProgram(transaction, "a", "  First   Program ");
      await createProgram(transaction, "b", "Second");
      db.exec(
        "INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('a', 's', 'Session', 0, 'Done', 0)",
      );
      expect(await listProgramSummaries(transaction)).toEqual([
        { id: "a", name: "First Program", sessionCount: 1 },
        { id: "b", name: "Second", sessionCount: 0 },
      ]);
      await renameProgram(transaction, "a", "Updated");
      expect(
        db.prepare("SELECT count(*) AS count FROM sessions").get(),
      ).toEqual({ count: 1 });
      await deleteProgram(transaction, "a");
      await createProgram(transaction, "c", "Third");
      expect(await listProgramSummaries(transaction)).toEqual([
        { id: "b", name: "Second", sessionCount: 0 },
        { id: "c", name: "Third", sessionCount: 0 },
      ]);
      expect(
        db.prepare("SELECT count(*) AS count FROM sessions").get(),
      ).toEqual({ count: 0 });
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  });

  it("rejects edits and deletion of missing programs", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`${SCHEMA_V1} BEGIN IMMEDIATE`);
      await expect(
        renameProgram(adapter(db), "missing", "Name"),
      ).rejects.toThrow("Program not found");
      await expect(deleteProgram(adapter(db), "missing")).rejects.toThrow(
        "Program not found",
      );
      db.exec("ROLLBACK");
    } finally {
      db.close();
    }
  });
});
