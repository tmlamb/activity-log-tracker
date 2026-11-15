import { describe, expect, it } from "vitest";

import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import {
  createProgram,
  deleteProgram,
  listProgramSummaries,
  renameProgram,
} from "./programs";

describe("program repository", () => {
  it("lists counts without loading sessions and preserves order after deletion", () => {
    const db = createTestDb();
    try {
      createProgram(db, "a", "  First   Program ");
      createProgram(db, "b", "Second");
      db.raw.exec(
        "INSERT INTO sessions(program_id, id, name, position, status, deload) VALUES ('a', 's', 'Session', 0, 'Done', 0)",
      );
      expect(listProgramSummaries(db)).toEqual([
        { id: "a", name: "First Program", sessionCount: 1 },
        { id: "b", name: "Second", sessionCount: 0 },
      ]);
      renameProgram(db, "a", "Updated");
      expect(
        db.raw.prepare("SELECT count(*) AS count FROM sessions").get(),
      ).toEqual({ count: 1 });
      deleteProgram(db, "a");
      createProgram(db, "c", "Third");
      expect(listProgramSummaries(db)).toEqual([
        { id: "b", name: "Second", sessionCount: 0 },
        { id: "c", name: "Third", sessionCount: 0 },
      ]);
      expect(
        db.raw.prepare("SELECT count(*) AS count FROM sessions").get(),
      ).toEqual({ count: 0 });
    } finally {
      db.raw.close();
    }
  });

  it("rejects edits and deletion of missing programs", () => {
    const db = createTestDb();
    try {
      expect(() => renameProgram(db, "missing", "Name")).toThrow(
        "Program not found",
      );
      expect(() => deleteProgram(db, "missing")).toThrow("Program not found");
    } finally {
      db.raw.close();
    }
  });

  it("rolls back program writes with the owning transaction", () => {
    const db = createTestDb();
    try {
      expect(() =>
        transaction(db, () => {
          createProgram(db, "a", "Program");
          renameProgram(db, "a", "Changed");
          createProgram(db, "a", "Duplicate");
        }),
      ).toThrow();
      expect(
        db.raw.prepare("SELECT count(*) AS count FROM programs").get(),
      ).toEqual({ count: 0 });
    } finally {
      db.raw.close();
    }
  });
});
