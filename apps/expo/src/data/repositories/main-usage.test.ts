import { describe, expect, it } from "vitest";

import type { SqlValue } from "../database/db";
import { createTestDb } from "../database/test-db";
import { getRecentMainUsage, MAIN_USAGE_SESSION_COUNT } from "./main-usage";

describe("recent main usage", () => {
  it("counts main activities in the source lineage's latest finished sessions", () => {
    const sessions = Array.from(
      { length: MAIN_USAGE_SESSION_COUNT + 1 },
      (_, index) =>
        `('p', 's${index}', 'lineage', 'S', ${index}, 'Done', 0, ${index * 100}, ${index * 100 + 50})`,
    ).join(",");
    const db = createTestDb(`
      INSERT INTO programs VALUES ('p', 'Program', 0);
      INSERT INTO session_lineages VALUES ('p', 'lineage');
      INSERT INTO exercises (id, name, normalized_name, position)
        VALUES ('bench', 'Bench', 'bench', 0), ('press', 'Press', 'press', 1);
      INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, start_ms, end_ms)
        VALUES ${sessions},
          ('p', 'other', NULL, 'Other', 99, 'Done', 0, 9000, 9050);
      -- The oldest session falls outside the recent window.
      INSERT INTO activities (program_id, session_id, id, exercise_id, position)
        VALUES ('p', 's0', 'a', 'press', 0), ('p', 's1', 'a', 'press', 0),
          ('p', 's2', 'a', 'bench', 0), ('p', 's3', 'a', 'bench', 0),
          ('p', 'other', 'a', 'bench', 0);
      -- Alternatives are not main activities.
      INSERT INTO activities (program_id, session_id, id, parent_activity_id, exercise_id, position)
        VALUES ('p', 's4', 'alt', NULL, 'press', 0),
          ('p', 's4', 'x', 'alt', 'bench', 0);`);
    try {
      expect(getRecentMainUsage(db, "p", "s5")).toEqual(
        new Map([
          ["bench", 2],
          ["press", 2],
        ]),
      );
    } finally {
      db.raw.close();
    }
  });

  it("reads only the recent sessions' activities, even without table statistics", () => {
    const db = createTestDb(`
      INSERT INTO programs VALUES ('p', 'Program', 0);
      INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload)
        VALUES ('p', 's', NULL, 'S', 0, 'Done', 0);`);
    const queries: { sql: string; parameters: SqlValue[] }[] = [];
    try {
      getRecentMainUsage(
        {
          ...db,
          getAllSync: <T>(sql: string, ...parameters: SqlValue[]) => {
            queries.push({ sql, parameters });
            return db.getAllSync<T>(sql, ...parameters);
          },
        },
        "p",
        "s",
      );
      const [query] = queries;
      if (!query) throw new Error("No query was run");
      const plan = db.raw
        .prepare(`EXPLAIN QUERY PLAN ${query.sql}`)
        .all(...query.parameters)
        .map((row) => (row as { detail: string }).detail);
      // Scanning activities first rebuilds `recent` for every activity in the
      // program, which took seconds on a long history.
      const recent = plan.indexOf("SCAN recent");
      const activities = plan.findIndex((detail) =>
        detail.startsWith("SEARCH a USING INDEX"),
      );
      expect(recent).toBeGreaterThanOrEqual(0);
      expect(activities).toBeGreaterThan(recent);
    } finally {
      db.raw.close();
    }
  });
});
