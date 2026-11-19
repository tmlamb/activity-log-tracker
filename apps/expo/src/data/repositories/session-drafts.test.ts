import { describe, expect, it } from "vitest";

import type { SessionDraft } from "./session-drafts";
import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import { createPlannedSession, saveSessionDraft } from "./session-drafts";

function setup(status = "Planned") {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload, revision)
      VALUES ('p', 'source', 'Source', 0, '${status}', 0, 2);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 'source', 'existing', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps)
      VALUES ('p', 'source', 'existing', 'old-set', 'Main', 0, 'Done', 'Neutral', 5);`);
  return db;
}

const draft: SessionDraft = {
  name: "  New   Workout ",
  deload: false,
  startMs: null,
  endMs: null,
  activities: [
    {
      id: "a",
      exerciseId: null,
      reps: 5,
      loadType: "RPE",
      loadValue: 8,
      restMinutes: 2,
      warmupSets: [
        {
          id: "w",
          status: "Planned",
          feedback: "Neutral",
          actualReps: null,
          weightValue: null,
          weightUnit: null,
          startMs: null,
          endMs: null,
        },
      ],
      mainSets: [
        {
          id: "m",
          status: "Planned",
          feedback: "Neutral",
          actualReps: null,
          weightValue: null,
          weightUnit: null,
          startMs: null,
          endMs: null,
        },
      ],
      alternatives: [],
    },
  ],
};

describe("session drafts", () => {
  it("creates a planned session and assigns a source lineage atomically", () => {
    const db = setup("Done");
    try {
      createPlannedSession(
        db,
        "p",
        "new",
        draft,
        { sessionId: "source", baseRevision: 2, newLineageId: "lineage" },
        1000,
      );
      expect(
        db.raw
          .prepare(
            "SELECT id, lineage_id, name, status, revision FROM sessions ORDER BY position",
          )
          .all(),
      ).toEqual([
        {
          id: "source",
          lineage_id: "lineage",
          name: "Source",
          status: "Done",
          revision: 3,
        },
        {
          id: "new",
          lineage_id: "lineage",
          name: "New Workout",
          status: "Planned",
          revision: 0,
        },
      ]);
      expect(
        db.raw
          .prepare(
            "SELECT kind, id FROM workout_sets WHERE session_id = 'new' ORDER BY kind",
          )
          .all(),
      ).toEqual([
        { kind: "Main", id: "m" },
        { kind: "Warmup", id: "w" },
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("rejects stale drafts before changing session data", () => {
    const db = setup();
    try {
      expect(() =>
        transaction(db, () =>
          saveSessionDraft(db, "p", "source", 1, draft, false, 1000),
        ),
      ).toThrow("session changed");
      expect(
        db.raw.prepare("SELECT name, revision FROM sessions").get(),
      ).toEqual({
        name: "Source",
        revision: 2,
      });
      expect(db.raw.prepare("SELECT id FROM workout_sets").get()).toEqual({
        id: "old-set",
      });
    } finally {
      db.raw.close();
    }
  });

  it("replaces only the edited session's activities and preserves their order", () => {
    const db = setup();
    try {
      saveSessionDraft(db, "p", "source", 2, draft, false, 1000);
      expect(
        db.raw
          .prepare("SELECT name, revision, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({
        name: "New Workout",
        revision: 3,
        last_activity_at_ms: 1000,
      });
      expect(
        db.raw.prepare("SELECT id FROM activities ORDER BY position").all(),
      ).toEqual([{ id: "a" }]);
      expect(
        db.raw.prepare("SELECT id FROM workout_sets ORDER BY kind").all(),
      ).toEqual([{ id: "m" }, { id: "w" }]);
    } finally {
      db.raw.close();
    }
  });

  it("does not replace finalized sets with nonterminal draft sets", () => {
    const db = setup("Done");
    try {
      saveSessionDraft(db, "p", "source", 2, draft, false, 1000);
      expect(
        db.raw.prepare("SELECT id, actual_reps FROM workout_sets").all(),
      ).toEqual([{ id: "old-set", actual_reps: 5 }]);
      expect(
        db.raw.prepare("SELECT status, end_ms FROM sessions").get(),
      ).toEqual({
        status: "Done",
        end_ms: 1000,
      });
    } finally {
      db.raw.close();
    }
  });

  it("rolls back lineage assignment if session insertion fails", () => {
    const db = setup("Done");
    try {
      expect(() =>
        transaction(db, () =>
          createPlannedSession(
            db,
            "p",
            "source",
            draft,
            { sessionId: "source", baseRevision: 2, newLineageId: "lineage" },
            1000,
          ),
        ),
      ).toThrow();
      expect(
        db.raw.prepare("SELECT lineage_id, revision FROM sessions").get(),
      ).toEqual({ lineage_id: null, revision: 2 });
      expect(
        db.raw.prepare("SELECT count(*) AS count FROM session_lineages").get(),
      ).toEqual({ count: 0 });
    } finally {
      db.raw.close();
    }
  });
});
