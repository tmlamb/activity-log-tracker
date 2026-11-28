import { describe, expect, it, vi } from "vitest";

import { createTestDb } from "./database/test-db";
import { optimizeDatabase } from "./open-database";

vi.mock("expo-sqlite", () => ({ openDatabaseSync: vi.fn() }));
vi.mock("expo-sqlite/kv-store", () => ({ default: {} }));
vi.mock("./legacy/bootstrap", () => ({ bootstrapDatabase: vi.fn() }));

describe("database statistics", () => {
  it("records table statistics for the query planner", () => {
    const db = createTestDb(`
      INSERT INTO programs VALUES ('p', 'Program', 0);
      INSERT INTO sessions(program_id, id, name, position, status, deload)
        VALUES ('p', 'a', 'A', 0, 'Done', 0), ('p', 'b', 'B', 1, 'Done', 0);`);
    const statistics = () =>
      db.raw
        .prepare(
          "SELECT count(*) AS count FROM sqlite_schema WHERE name = 'sqlite_stat1'",
        )
        .get() as { count: number };
    try {
      expect(statistics().count).toBe(0);
      optimizeDatabase(db);
      expect(statistics().count).toBe(1);
      expect(
        db.raw
          .prepare(
            "SELECT DISTINCT tbl FROM sqlite_stat1 WHERE tbl = 'sessions'",
          )
          .all(),
      ).toEqual([{ tbl: "sessions" }]);
    } finally {
      db.raw.close();
    }
  });
});
