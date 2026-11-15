import { describe, expect, it } from "vitest";

import type { Db } from "../database/db";
import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import {
  completeSetAndAdvance,
  patchSetRecording,
  reconcileTerminalSet,
  saveSetRecording,
  startSet,
} from "./sets";

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
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload)
      VALUES ('p', 's', 'Session', 0, '${status}', 0);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 's', 'a', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, start_ms, end_ms)
      VALUES ('p', 's', 'a', 'k', 'Main', 0, 'Done', 'Neutral', 100, 200),
             ('p', 's', 'a', 'other', 'Main', 1, 'Planned', 'Easy', NULL, NULL);
  `);
  return db;
}

describe("set recording", () => {
  it("updates only edited fields without overwriting newer recording state", () => {
    const db = setup("Done");
    try {
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = 75, weight_unit = 'kg', feedback = 'Hard' WHERE id = 'k'",
      );
      expect(patchSetRecording(db, reference, { actualReps: 7 }, 500)).toBe(
        true,
      );
      expect(patchSetRecording(db, reference, { actualReps: 7 }, 600)).toBe(
        false,
      );
      expect(
        db.raw
          .prepare(
            "SELECT status,start_ms,end_ms,actual_reps,weight_value,weight_unit,feedback FROM workout_sets WHERE id = 'k'",
          )
          .get(),
      ).toEqual({
        status: "Done",
        start_ms: 100,
        end_ms: 200,
        actual_reps: 7,
        weight_value: 75,
        weight_unit: "kg",
        feedback: "Hard",
      });
      expect(
        db.raw
          .prepare(
            "SELECT revision,last_activity_at_ms FROM sessions WHERE id = 's'",
          )
          .get(),
      ).toEqual({ revision: 1, last_activity_at_ms: 500 });
    } finally {
      db.raw.close();
    }
  });

  it("updates only the target set and session metadata", () => {
    const db = setup("Ready");
    try {
      saveSetRecording(db, reference, recording, 500);
      expect(
        db.raw
          .prepare(
            "SELECT id, status, feedback, start_ms FROM workout_sets ORDER BY position",
          )
          .all(),
      ).toEqual([
        { id: "k", status: "Ready", feedback: "Hard", start_ms: 300 },
        { id: "other", status: "Planned", feedback: "Easy", start_ms: null },
      ]);
      expect(
        db.raw
          .prepare("SELECT last_activity_at_ms, revision FROM sessions")
          .get(),
      ).toEqual({ last_activity_at_ms: 500, revision: 1 });
    } finally {
      db.raw.close();
    }
  });

  it("preserves terminal set status and timestamps on recording edits", () => {
    const db = setup("Done");
    try {
      saveSetRecording(db, reference, recording, 500);
      expect(
        db.raw
          .prepare(
            "SELECT status, start_ms, end_ms, actual_reps FROM workout_sets WHERE id = 'k'",
          )
          .get(),
      ).toEqual({ status: "Done", start_ms: 100, end_ms: 200, actual_reps: 5 });
    } finally {
      db.raw.close();
    }
  });

  it("does not change session metadata when the set is missing", () => {
    const db = setup("Ready");
    try {
      expect(() =>
        transaction(db, () =>
          saveSetRecording(
            db,
            { ...reference, setId: "missing" },
            recording,
            500,
          ),
        ),
      ).toThrow("Workout set not found");
      expect(
        db.raw
          .prepare("SELECT last_activity_at_ms, revision FROM sessions")
          .get(),
      ).toEqual({ last_activity_at_ms: null, revision: 0 });
    } finally {
      db.raw.close();
    }
  });
});

describe("transactional workout set actions", () => {
  it("starts the session with its first set, then completes and advances from warmup to main", () => {
    const db = setup("Planned");
    try {
      db.raw.exec(
        "UPDATE workout_sets SET kind = 'Warmup', status = 'Planned', start_ms = NULL, end_ms = NULL WHERE id = 'k'",
      );
      startSet(db, reference, recording, 1000);
      expect(
        db.raw.prepare("SELECT status, start_ms FROM sessions").get(),
      ).toEqual({ status: "Ready", start_ms: 1000 });
      const next = completeSetAndAdvance(db, reference, recording, 1_501_000);
      expect(next).toBe("other");
      expect(
        db.raw
          .prepare(
            "SELECT id, status, start_ms, end_ms FROM workout_sets ORDER BY id",
          )
          .all(),
      ).toEqual([
        { id: "k", status: "Done", start_ms: 1000, end_ms: 1_201_000 },
        { id: "other", status: "Ready", start_ms: 1_501_000, end_ms: null },
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("rejects starting a later pending set and completing without reps", () => {
    const db = setup("Ready");
    try {
      db.raw.exec("UPDATE workout_sets SET status = 'Planned' WHERE id = 'k'");
      expect(() =>
        startSet(db, { ...reference, setId: "other" }, recording, 500),
      ).toThrow("first pending set");
      db.raw.exec("UPDATE workout_sets SET status = 'Ready' WHERE id = 'k'");
      expect(() =>
        transaction(db, () =>
          completeSetAndAdvance(
            db,
            reference,
            { ...recording, actualReps: 0 },
            500,
          ),
        ),
      ).toThrow("cannot be completed");
    } finally {
      db.raw.close();
    }
  });

  it("rolls back the completed set if advancing the next set fails", () => {
    const db = setup("Ready");
    try {
      db.raw.exec("UPDATE workout_sets SET status = 'Ready' WHERE id = 'k'");
      const failing: Db = {
        ...db,
        runSync: (sql, ...parameters) => {
          if (sql.includes("SET start_ms = ?, status = 'Ready'"))
            throw new Error("write failed");
          return db.runSync(sql, ...parameters);
        },
      };
      expect(() =>
        transaction(failing, () =>
          completeSetAndAdvance(failing, reference, recording, 500),
        ),
      ).toThrow("write failed");
      expect(
        db.raw.prepare("SELECT status FROM workout_sets WHERE id = 'k'").get(),
      ).toEqual({ status: "Ready" });
      expect(
        db.raw
          .prepare("SELECT status FROM workout_sets WHERE id = 'other'")
          .get(),
      ).toEqual({ status: "Planned" });
    } finally {
      db.raw.close();
    }
  });
});

describe("terminal set reconciliation", () => {
  it("reconciles edited reps and preserves terminal session status", () => {
    const db = setup("Incomplete");
    try {
      db.raw.exec(
        "UPDATE sessions SET end_ms = 600 WHERE id = 's'; UPDATE workout_sets SET status = 'Incomplete', actual_reps = 0, start_ms = NULL, end_ms = NULL WHERE id = 'k'",
      );
      expect(reconcileTerminalSet(db, reference, 5, 1000)).toBe(true);
      expect(
        db.raw
          .prepare(
            "SELECT status, actual_reps, start_ms, end_ms FROM workout_sets WHERE id = 'k'",
          )
          .get(),
      ).toEqual({ status: "Done", actual_reps: 5, start_ms: 600, end_ms: 600 });
      expect(
        db.raw
          .prepare("SELECT status, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({ status: "Incomplete", last_activity_at_ms: 1000 });
    } finally {
      db.raw.close();
    }
  });

  it("does not write unchanged values or reconcile an active session", () => {
    const db = setup("Done");
    try {
      db.raw.exec("UPDATE workout_sets SET actual_reps = 5 WHERE id = 'k'");
      expect(reconcileTerminalSet(db, reference, 5, 1000)).toBe(false);
      db.raw.exec("UPDATE sessions SET status = 'Ready'");
      expect(reconcileTerminalSet(db, reference, 0, 1000)).toBe(false);
      expect(db.raw.prepare("SELECT revision FROM sessions").get()).toEqual({
        revision: 0,
      });
    } finally {
      db.raw.close();
    }
  });
});
