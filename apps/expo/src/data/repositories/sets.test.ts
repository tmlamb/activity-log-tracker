import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { completeSetAndAdvance, saveSetRecording, startSet } from "./sets";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) => {
      const result = db.prepare(sql).run(...parameters);
      return Promise.resolve({ changes: Number(result.changes) });
    },
  };
}

const reference = {
  programId: "p",
  sessionId: "s",
  activityId: "a",
  setId: "k",
};
const recording = {
  actualReps: 5,
  weight: { value: 100, unit: "lbs" as const },
  feedback: "Hard" as const,
  status: "Ready" as const,
  startMs: 300,
  endMs: null,
};

function setup(status: string) {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}`);
  db.exec(`
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload)
      VALUES ('p', 's', 'Session', 0, '${status}', 0);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, start_ms, end_ms)
      VALUES ('p', 's', 'a', 'k', 'Main', 0, 'Done', 'Neutral', 100, 200),
             ('p', 's', 'a', 'other', 'Main', 1, 'Planned', 'Easy', NULL, NULL);
    BEGIN IMMEDIATE;
  `);
  return db;
}

describe("set recording", () => {
  it("updates only the target set and session metadata", async () => {
    const db = setup("Ready");
    try {
      await saveSetRecording(adapter(db), reference, recording, 500);
      db.exec("COMMIT");
      expect(
        db
          .prepare(
            "SELECT id, status, feedback, start_ms FROM workout_sets ORDER BY position",
          )
          .all(),
      ).toEqual([
        { id: "k", status: "Ready", feedback: "Hard", start_ms: 300 },
        { id: "other", status: "Planned", feedback: "Easy", start_ms: null },
      ]);
      expect(
        db.prepare("SELECT last_activity_at_ms, revision FROM sessions").get(),
      ).toEqual({ last_activity_at_ms: 500, revision: 1 });
    } finally {
      db.close();
    }
  });

  it("preserves terminal set status and timestamps on recording edits", async () => {
    const db = setup("Done");
    try {
      await saveSetRecording(adapter(db), reference, recording, 500);
      db.exec("COMMIT");
      expect(
        db
          .prepare(
            "SELECT status, start_ms, end_ms, actual_reps FROM workout_sets WHERE id = 'k'",
          )
          .get(),
      ).toEqual({ status: "Done", start_ms: 100, end_ms: 200, actual_reps: 5 });
    } finally {
      db.close();
    }
  });

  it("does not change session metadata when the set is missing", async () => {
    const db = setup("Ready");
    try {
      await expect(
        saveSetRecording(
          adapter(db),
          { ...reference, setId: "missing" },
          recording,
          500,
        ),
      ).rejects.toThrow("Workout set not found");
      db.exec("ROLLBACK");
      expect(
        db.prepare("SELECT last_activity_at_ms, revision FROM sessions").get(),
      ).toEqual({ last_activity_at_ms: null, revision: 0 });
    } finally {
      db.close();
    }
  });
});

describe("transactional workout set actions", () => {
  it("starts the session with its first set, then completes and advances from warmup to main", async () => {
    const db = setup("Planned");
    try {
      db.exec(
        "UPDATE workout_sets SET kind = 'Warmup', status = 'Planned', start_ms = NULL, end_ms = NULL WHERE id = 'k'",
      );
      await startSet(adapter(db), reference, recording, 1000);
      expect(db.prepare("SELECT status, start_ms FROM sessions").get()).toEqual(
        { status: "Ready", start_ms: 1000 },
      );
      const next = await completeSetAndAdvance(
        adapter(db),
        reference,
        recording,
        1_501_000,
      );
      db.exec("COMMIT");
      expect(next).toBe("other");
      expect(
        db
          .prepare(
            "SELECT id, status, start_ms, end_ms FROM workout_sets ORDER BY id",
          )
          .all(),
      ).toEqual([
        { id: "k", status: "Done", start_ms: 1000, end_ms: 1_201_000 },
        { id: "other", status: "Ready", start_ms: 1_501_000, end_ms: null },
      ]);
    } finally {
      db.close();
    }
  });

  it("rejects starting a later pending set and completing without reps", async () => {
    const db = setup("Ready");
    try {
      db.exec("UPDATE workout_sets SET status = 'Planned' WHERE id = 'k'");
      await expect(
        startSet(adapter(db), { ...reference, setId: "other" }, recording, 500),
      ).rejects.toThrow("first pending set");
      db.exec("UPDATE workout_sets SET status = 'Ready' WHERE id = 'k'");
      await expect(
        completeSetAndAdvance(
          adapter(db),
          reference,
          { ...recording, actualReps: 0 },
          500,
        ),
      ).rejects.toThrow("cannot be completed");
      db.exec("ROLLBACK");
    } finally {
      db.close();
    }
  });

  it("rolls back the completed set if advancing the next set fails", async () => {
    const db = setup("Ready");
    try {
      db.exec(
        "COMMIT; UPDATE workout_sets SET status = 'Ready' WHERE id = 'k'; BEGIN IMMEDIATE",
      );
      const transaction = adapter(db);
      const failing = {
        ...transaction,
        runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
          sql.includes("SET start_ms = ?, status = 'Ready'")
            ? Promise.reject(new Error("write failed"))
            : transaction.runAsync(sql, ...parameters),
      };
      await expect(
        completeSetAndAdvance(failing, reference, recording, 500),
      ).rejects.toThrow("write failed");
      db.exec("ROLLBACK");
      expect(
        db.prepare("SELECT status FROM workout_sets WHERE id = 'k'").get(),
      ).toEqual({ status: "Ready" });
      expect(
        db.prepare("SELECT status FROM workout_sets WHERE id = 'other'").get(),
      ).toEqual({ status: "Planned" });
    } finally {
      db.close();
    }
  });
});
