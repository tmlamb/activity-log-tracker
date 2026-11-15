import { describe, expect, it } from "vitest";

import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import {
  cleanupInactiveSessions,
  completeSession,
  deleteSession,
  resetSession,
  setSessionDeload,
} from "./session-lifecycle";

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms, last_activity_at_ms)
      VALUES ('p', 's', 'Session', 0, 'Ready', 0, 100, 200);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, start_ms, end_ms)
      VALUES ('p', 's', 'a', 'already', 'Main', 0, 'Done', 'Neutral', 5, NULL, NULL),
             ('p', 's', 'a', 'positive', 'Main', 1, 'Ready', 'Neutral', 5, 900, 800),
             ('p', 's', 'a', 'started', 'Main', 2, 'Ready', 'Neutral', 0, 300, NULL),
             ('p', 's', 'a', 'unstarted', 'Main', 3, 'Planned', 'Neutral', NULL, NULL, NULL);`);
  return db;
}

describe("session lifecycle", () => {
  it("finalizes sets with the existing completion semantics", () => {
    const db = setup();
    try {
      expect(completeSession(db, "p", "s", 600, 1000)).toBe(true);
      expect(
        db.raw
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
        db.raw
          .prepare("SELECT status, end_ms, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({ status: "Done", end_ms: 600, last_activity_at_ms: 1000 });
      expect(completeSession(db, "p", "s", 700, 1100)).toBe(false);
    } finally {
      db.raw.close();
    }
  });

  it("acknowledges a timed-out session without replacing its recorded end", () => {
    const db = setup();
    try {
      db.raw.exec(
        "UPDATE sessions SET status = 'Incomplete', end_ms = 400 WHERE id = 's'",
      );
      completeSession(db, "p", "s", 900, 1000);
      expect(
        db.raw
          .prepare("SELECT status, end_ms, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({ status: "Done", end_ms: 400, last_activity_at_ms: 1000 });
    } finally {
      db.raw.close();
    }
  });

  it("cleans up only expired ready sessions and uses the legacy completed-set fallback", () => {
    const db = setup();
    try {
      db.raw
        .exec(`UPDATE sessions SET last_activity_at_ms = NULL WHERE id = 's';
        UPDATE workout_sets SET end_ms = 250 WHERE id = 'already';
        INSERT INTO sessions(program_id, id, name, position, status, deload, last_activity_at_ms)
          VALUES ('p', 'recent', 'Recent', 1, 'Ready', 0, 5_000_000),
                 ('p', 'planned', 'Planned', 2, 'Planned', 0, NULL);`);
      const expired = cleanupInactiveSessions(db, 5_000_000);
      expect(expired).toEqual([{ programId: "p", sessionId: "s" }]);
      expect(
        db.raw
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
      db.raw.close();
    }
  });
});

describe("session metadata operations", () => {
  it("resets only the selected session while retaining its planning, weights, feedback, deload, and lineage", () => {
    const db = setup();
    try {
      db.raw.exec(`INSERT INTO session_lineages VALUES ('p', 'lineage');
        UPDATE sessions SET lineage_id = 'lineage', deload = 1, status = 'Done', end_ms = 500 WHERE id = 's';
        UPDATE workout_sets SET weight_value = 42.5, weight_unit = 'kg', feedback = 'Hard' WHERE id = 'positive';
        INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
          VALUES ('p', 'other', 'Other', 1, 'Ready', 0, 123);
        INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 'other', 'a', 0);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps)
          VALUES ('p', 'other', 'a', 'positive', 'Main', 0, 'Done', 'Easy', 9);`);
      resetSession(db, "p", "s", 0, 1000);
      expect(
        db.raw
          .prepare(
            "SELECT status, start_ms, end_ms, last_activity_at_ms, deload, lineage_id, revision FROM sessions WHERE id = 's'",
          )
          .get(),
      ).toEqual({
        status: "Planned",
        start_ms: null,
        end_ms: null,
        last_activity_at_ms: 1000,
        deload: 1,
        lineage_id: "lineage",
        revision: 1,
      });
      expect(
        db.raw
          .prepare(
            "SELECT status, start_ms, end_ms, actual_reps, weight_value, weight_unit, feedback FROM workout_sets WHERE session_id = 's' AND id = 'positive'",
          )
          .get(),
      ).toEqual({
        status: "Planned",
        start_ms: null,
        end_ms: null,
        actual_reps: 0,
        weight_value: 42.5,
        weight_unit: "kg",
        feedback: "Hard",
      });
      expect(
        db.raw
          .prepare(
            "SELECT COUNT(*) AS count FROM workout_sets WHERE session_id = 's' AND (status <> 'Planned' OR start_ms IS NOT NULL OR end_ms IS NOT NULL OR actual_reps <> 0)",
          )
          .get(),
      ).toEqual({ count: 0 });
      expect(
        db.raw
          .prepare(
            "SELECT status, actual_reps FROM workout_sets WHERE session_id = 'other'",
          )
          .get(),
      ).toEqual({ status: "Done", actual_reps: 9 });
      expect(() => resetSession(db, "p", "s", 0, 2000)).toThrow(
        "session changed",
      );
      expect(() => resetSession(db, "p", "missing", 0, 2000)).toThrow(
        "Session not found",
      );
    } finally {
      db.raw.close();
    }
  });

  it("rolls back set resets if the session update fails", () => {
    const db = setup();
    try {
      db.raw.exec(
        `CREATE TRIGGER reject_reset BEFORE UPDATE ON sessions BEGIN SELECT RAISE(ABORT, 'reset failed'); END;`,
      );
      expect(() =>
        transaction(db, () => resetSession(db, "p", "s", 0, 1000)),
      ).toThrow("reset failed");
      expect(
        db.raw
          .prepare(
            "SELECT status, actual_reps FROM workout_sets WHERE id = 'positive'",
          )
          .get(),
      ).toEqual({ status: "Ready", actual_reps: 5 });
    } finally {
      db.raw.close();
    }
  });

  it("updates deload and protects against deleting a stale revision", () => {
    const db = setup();
    try {
      setSessionDeload(db, "p", "s", true, 1000);
      expect(() => deleteSession(db, "p", "s", 0)).toThrow("session changed");
      expect(
        db.raw
          .prepare("SELECT deload, revision, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({ deload: 1, revision: 1, last_activity_at_ms: 1000 });
      deleteSession(db, "p", "s", 1);
      expect(
        db.raw.prepare("SELECT count(*) AS count FROM workout_sets").get(),
      ).toEqual({ count: 0 });
    } finally {
      db.raw.close();
    }
  });
});
