import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { SessionDraft } from "./session-drafts";
import { SCHEMA_V1 } from "../database/schema";
import { createPlannedSession, saveSessionDraft } from "./session-drafts";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
  };
}

function setup(status = "Planned") {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO programs VALUES ('p', 'Program', 0);
    INSERT INTO sessions(program_id, id, name, position, status, deload, revision)
      VALUES ('p', 'source', 'Source', 0, '${status}', 0, 2);
    INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 'source', 'existing', 0);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps)
      VALUES ('p', 'source', 'existing', 'old-set', 'Main', 0, 'Done', 'Neutral', 5);
    BEGIN IMMEDIATE`);
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
    },
  ],
};

describe("session drafts", () => {
  it("creates a planned session and assigns a source lineage atomically", async () => {
    const db = setup("Done");
    try {
      await createPlannedSession(
        adapter(db),
        "p",
        "new",
        draft,
        { sessionId: "source", baseRevision: 2, newLineageId: "lineage" },
        1000,
      );
      db.exec("COMMIT");
      expect(
        db
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
        db
          .prepare(
            "SELECT kind, id FROM workout_sets WHERE session_id = 'new' ORDER BY kind",
          )
          .all(),
      ).toEqual([
        { kind: "Main", id: "m" },
        { kind: "Warmup", id: "w" },
      ]);
    } finally {
      db.close();
    }
  });

  it("rejects stale drafts before changing session data", async () => {
    const db = setup();
    try {
      await expect(
        saveSessionDraft(adapter(db), "p", "source", 1, draft, false, 1000),
      ).rejects.toThrow("session changed");
      db.exec("ROLLBACK");
      expect(db.prepare("SELECT name, revision FROM sessions").get()).toEqual({
        name: "Source",
        revision: 2,
      });
      expect(db.prepare("SELECT id FROM workout_sets").get()).toEqual({
        id: "old-set",
      });
    } finally {
      db.close();
    }
  });

  it("replaces only the edited session's activities and preserves their order", async () => {
    const db = setup();
    try {
      await saveSessionDraft(adapter(db), "p", "source", 2, draft, false, 1000);
      db.exec("COMMIT");
      expect(
        db
          .prepare("SELECT name, revision, last_activity_at_ms FROM sessions")
          .get(),
      ).toEqual({
        name: "New Workout",
        revision: 3,
        last_activity_at_ms: 1000,
      });
      expect(
        db.prepare("SELECT id FROM activities ORDER BY position").all(),
      ).toEqual([{ id: "a" }]);
      expect(
        db.prepare("SELECT id FROM workout_sets ORDER BY kind").all(),
      ).toEqual([{ id: "m" }, { id: "w" }]);
    } finally {
      db.close();
    }
  });

  it("does not replace finalized sets with nonterminal draft sets", async () => {
    const db = setup("Done");
    try {
      await saveSessionDraft(adapter(db), "p", "source", 2, draft, false, 1000);
      db.exec("COMMIT");
      expect(
        db.prepare("SELECT id, actual_reps FROM workout_sets").all(),
      ).toEqual([{ id: "old-set", actual_reps: 5 }]);
      expect(db.prepare("SELECT status, end_ms FROM sessions").get()).toEqual({
        status: "Done",
        end_ms: 1000,
      });
    } finally {
      db.close();
    }
  });

  it("rolls back lineage assignment if session insertion fails", async () => {
    const db = setup("Done");
    try {
      await expect(
        createPlannedSession(
          adapter(db),
          "p",
          "source",
          draft,
          { sessionId: "source", baseRevision: 2, newLineageId: "lineage" },
          1000,
        ),
      ).rejects.toThrow();
      db.exec("ROLLBACK");
      expect(
        db.prepare("SELECT lineage_id, revision FROM sessions").get(),
      ).toEqual({ lineage_id: null, revision: 2 });
      expect(
        db.prepare("SELECT count(*) AS count FROM session_lineages").get(),
      ).toEqual({ count: 0 });
    } finally {
      db.close();
    }
  });
});
