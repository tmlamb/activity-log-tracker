import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { cleanupInactiveSessions, completeSession } from "./session-lifecycle";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve(db.prepare(sql).all(...parameters) as T[]),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms, last_activity_at_ms)
      VALUES ('p', 's', 'Session', 0, 'Ready', 0, 100, 200);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, start_ms, end_ms)
      VALUES ('p', 's', 'a', 'already', 'Main', 0, 'Done', 'Neutral', 5, NULL, NULL),
             ('p', 's', 'a', 'positive', 'Main', 1, 'Ready', 'Neutral', 5, 900, 800),
             ('p', 's', 'a', 'started', 'Main', 2, 'Ready', 'Neutral', 0, 300, NULL),
             ('p', 's', 'a', 'unstarted', 'Main', 3, 'Planned', 'Neutral', NULL, NULL, NULL);
    BEGIN IMMEDIATE;`);
  return db;
}

describe("session lifecycle", () => {
  it("finalizes sets with the existing completion semantics", async () => {
    const db = setup();
    try {
      await expect(
        completeSession(adapter(db), "p", "s", 600, 1000),
      ).resolves.toBe(true);
      db.exec("COMMIT");
      expect(
        db
          .prepare(
            "SELECT id, status, start_ms, end_ms FROM workout_sets ORDER BY position",
          )
          .all(),
      ).toEqual([
        { id: "already", status: "Done", start_ms: null, end_ms: null },
        { id: "positive", status: "Done", start_ms: 800, end_ms: 800 },
        { id: "started", status: "Incomplete", start_ms: 300, end_ms: 600 },
        { id: "unstarted", status: "Incomplete", start_ms: null, end_ms: null },
      ]);
      expect(
        db
          .prepare("SELECT status, end_ms, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({ status: "Done", end_ms: 600, last_activity_at_ms: 1000 });
      await expect(
        completeSession(adapter(db), "p", "s", 700, 1100),
      ).resolves.toBe(false);
    } finally {
      db.close();
    }
  });

  it("acknowledges a timed-out session without replacing its recorded end", async () => {
    const db = setup();
    try {
      db.exec(
        "UPDATE sessions SET status = 'Incomplete', end_ms = 400 WHERE id = 's'",
      );
      await completeSession(adapter(db), "p", "s", 900, 1000);
      db.exec("COMMIT");
      expect(
        db
          .prepare("SELECT status, end_ms, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({ status: "Done", end_ms: 400, last_activity_at_ms: 1000 });
    } finally {
      db.close();
    }
  });

  it("cleans up only expired ready sessions and uses the legacy completed-set fallback", async () => {
    const db = setup();
    try {
      db.exec(`UPDATE sessions SET last_activity_at_ms = NULL WHERE id = 's';
        UPDATE workout_sets SET end_ms = 250 WHERE id = 'already';
        INSERT INTO sessions(program_id, id, name, position, status, deload, last_activity_at_ms)
          VALUES ('p', 'recent', 'Recent', 1, 'Ready', 0, 5_000_000),
                 ('p', 'planned', 'Planned', 2, 'Planned', 0, NULL);`);
      const expired = await cleanupInactiveSessions(adapter(db), 5_000_000);
      db.exec("COMMIT");
      expect(expired).toEqual([{ programId: "p", sessionId: "s" }]);
      expect(
        db
          .prepare(
            "SELECT id, status, end_ms, last_activity_at_ms FROM sessions ORDER BY position",
          )
          .all(),
      ).toEqual([
        {
          id: "s",
          status: "Incomplete",
          end_ms: 250,
          last_activity_at_ms: 250,
        },
        {
          id: "recent",
          status: "Ready",
          end_ms: null,
          last_activity_at_ms: 5_000_000,
        },
        {
          id: "planned",
          status: "Planned",
          end_ms: null,
          last_activity_at_ms: null,
        },
      ]);
    } finally {
      db.close();
    }
  });
});
