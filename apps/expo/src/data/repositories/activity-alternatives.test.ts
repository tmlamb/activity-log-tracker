import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DraftAlternative, SessionDraft } from "./session-drafts";
import { completeSession } from "../actions";
import { buildPortableDataV2, readPortableFactsV2 } from "../backup/export-v2";
import { serializePortableBackupV2 } from "../backup/portable-v2";
import { prepareApplicationRestore } from "../backup/prepare-restore";
import { transaction } from "../database/db";
import { migrateDatabase, MIGRATIONS } from "../database/migrations";
import { createTestDb, nodeDb } from "../database/test-db";
import { replaceDomainData } from "../lifecycle/replace";
import { setDatabase } from "../store";
import { readExerciseSeriesFacts } from "./exercise-series";
import { getRecentMainUsage } from "./main-usage";
import {
  getAlternativeWeightHints,
  getPlanningWeightHints,
} from "./planning-weights";
import { readProgramInsightFacts } from "./program-insights";
import { getSessionDetail } from "./session-detail";
import { createPlannedSession, saveSessionDraft } from "./session-drafts";
import { createTemplateDraft } from "./template-draft";

vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));

const set = (id: string, overrides: object = {}) => ({
  id,
  status: "Planned" as const,
  feedback: "Neutral" as const,
  actualReps: 0,
  weightValue: null,
  weightUnit: null,
  startMs: null,
  endMs: null,
  ...overrides,
});
const row = (id: string, exerciseId: string): DraftAlternative => ({
  id,
  exerciseId,
  reps: 8,
  loadType: "RPE",
  loadValue: 8,
  restMinutes: 2,
  warmupSets: [],
  mainSets: [set(`${id}-m`)],
});
const draft = (): SessionDraft => ({
  name: "Day",
  deload: false,
  startMs: null,
  endMs: null,
  activities: [
    {
      ...row("a", "e"),
      alternatives: [row("a1", "f"), row("a2", "g")],
      supersets: [],
    },
    { ...row("b", "e"), alternatives: [], supersets: [] },
  ],
});
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Missing item ${index}`);
  return item;
}
const seed = `
  INSERT INTO programs (id, name, position) VALUES ('p', 'Program', 0);
  INSERT INTO exercises (id, name, normalized_name, position)
    VALUES ('e', 'Bench', 'bench', 0), ('f', 'Dumbbell', 'dumbbell', 1), ('g', 'Machine', 'machine', 2);`;

afterEach(() => setDatabase(undefined));

describe("activity alternatives", () => {
  it("migrates an existing database without losing activities or sets", () => {
    const db = nodeDb(new DatabaseSync(":memory:"));
    db.raw.exec("PRAGMA foreign_keys = ON");
    try {
      migrateDatabase(db, MIGRATIONS.slice(0, 1));
      db.raw.exec(`${seed}
        INSERT INTO sessions (program_id, id, name, position, status, deload) VALUES ('p', 's', 'S', 0, 'Done', 0);
        INSERT INTO activities (program_id, session_id, id, exercise_id, position, reps, load_type, load_value, rest_minutes)
          VALUES ('p', 's', 'a', 'e', 0, 5, 'RPE', 8, 2), ('p', 's', 'b', 'f', 1, NULL, NULL, NULL, NULL);
        INSERT INTO workout_sets (program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, weight_value, weight_unit)
          VALUES ('p', 's', 'a', 'm', 'Main', 0, 'Done', 'Hard', 5, 100, 'lbs');`);
      const before = {
        activities: db.raw.prepare("SELECT * FROM activities").all(),
        sets: db.raw.prepare("SELECT * FROM workout_sets").all(),
      };
      expect(transaction(db, () => migrateDatabase(db))).toBe(1);
      expect(
        db.raw
          .prepare(
            "SELECT program_id, session_id, id, exercise_id, position, reps, load_type, load_value, rest_minutes FROM activities",
          )
          .all(),
      ).toEqual(before.activities);
      expect(
        db.raw
          .prepare(
            "SELECT COUNT(*) AS count FROM activities WHERE parent_activity_id IS NOT NULL",
          )
          .get(),
      ).toEqual({ count: 0 });
      expect(db.raw.prepare("SELECT * FROM workout_sets").all()).toEqual(
        before.sets,
      );
      expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      // Main positions stay unique; alternatives number from 0 per parent.
      expect(() =>
        db.raw.exec(
          "INSERT INTO activities (program_id, session_id, id, position) VALUES ('p', 's', 'c', 0)",
        ),
      ).toThrow();
      db.raw.exec(
        "INSERT INTO activities (program_id, session_id, id, parent_activity_id, exercise_id, position) VALUES ('p', 's', 'a1', 'a', 'g', 0)",
      );
      expect(() =>
        db.raw.exec(
          "INSERT INTO activities (program_id, session_id, id, parent_activity_id, position) VALUES ('p', 's', 'x', 'missing', 0)",
        ),
      ).toThrow();
      db.raw.exec("DELETE FROM activities WHERE id = 'a'");
      expect(
        db.raw.prepare("SELECT id FROM activities ORDER BY id").all(),
      ).toEqual([{ id: "b" }]);
    } finally {
      db.raw.close();
    }
  });

  it("saves, reads and replaces alternatives with their parent", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const detail = getSessionDetail(db, "p", "s");
      expect(detail?.activities.map((item) => item.id)).toEqual(["a", "b"]);
      expect(
        detail?.activities[0]?.alternatives.map((item) => [
          item.id,
          item.exerciseName,
          item.mainSets.length,
        ]),
      ).toEqual([
        ["a1", "Dumbbell", 1],
        ["a2", "Machine", 1],
      ]);
      // Dropping a main activity drops its alternatives and their sets.
      const next = draft();
      next.activities = next.activities.slice(1);
      saveSessionDraft(db, "p", "s", 0, next, false, 2);
      expect(
        db.raw.prepare("SELECT id FROM activities ORDER BY id").all(),
      ).toEqual([{ id: "b" }]);
      expect(
        db.raw.prepare("SELECT activity_id FROM workout_sets").all(),
      ).toEqual([{ activity_id: "b" }]);
    } finally {
      db.raw.close();
    }
  });

  it("rejects IDs shared between activities and alternatives", () => {
    const db = createTestDb(seed);
    try {
      const value = draft();
      nth(nth(value.activities, 0).alternatives, 0).id = "b";
      expect(() => createPlannedSession(db, "p", "s", value, null, 1)).toThrow(
        "duplicate activity ID",
      );
    } finally {
      db.raw.close();
    }
  });

  it("plans alternatives forward from a template", () => {
    const db = createTestDb(seed);
    try {
      const value = draft();
      nth(nth(value.activities, 0).alternatives, 0).mainSets = [
        set("done", {
          status: "Done",
          actualReps: 11,
          weightValue: 40,
          weightUnit: "lbs",
        }),
      ];
      createPlannedSession(db, "p", "s", value, null, 1);
      const source = getSessionDetail(db, "p", "s");
      if (!source) throw new Error("Missing session");
      let id = 0;
      const planned = createTemplateDraft(source, () => `new-${++id}`);
      const alternative = planned.activities[0]?.alternatives[0];
      expect(planned.activities[0]?.alternatives).toHaveLength(2);
      expect(alternative).toMatchObject({
        exerciseId: "f",
        reps: 11,
        mainSets: [
          {
            status: "Planned",
            actualReps: 0,
            weightValue: 40,
            weightUnit: "lbs",
          },
        ],
      });
      expect(alternative?.id).toMatch(/^new-/);
    } finally {
      db.raw.close();
    }
  });

  it("matches alternative weight hints and keeps main hints unaffected", () => {
    const db = createTestDb(seed);
    try {
      const value = draft();
      nth(value.activities, 0).mainSets = [
        set("am", { weightValue: 100, weightUnit: "lbs" }),
      ];
      nth(nth(value.activities, 0).alternatives, 1).mainSets = [
        set("a2m", { weightValue: 60, weightUnit: "kg" }),
      ];
      nth(value.activities, 1).mainSets = [
        set("bm", { weightValue: 120, weightUnit: "lbs" }),
      ];
      createPlannedSession(db, "p", "s", value, null, 1);
      const source = { kind: "session" as const, sessionId: "s" };
      const parents = value.activities.map(({ exerciseId, loadType }) => ({
        exerciseId,
        loadType,
      }));
      // Alternatives don't shift the occurrence of the second Bench row.
      expect(getPlanningWeightHints(db, "p", source, parents, "Main")).toEqual([
        { activityIndex: 0, weight: { value: 100, unit: "lbs" } },
        { activityIndex: 1, weight: { value: 120, unit: "lbs" } },
      ]);
      expect(
        getAlternativeWeightHints(
          db,
          "p",
          source,
          parents,
          0,
          [
            { exerciseId: "g", loadType: "RPE" },
            { exerciseId: "f", loadType: "RPE" },
          ],
          "Main",
        ),
      ).toEqual([
        { activityIndex: 0, weight: { value: 60, unit: "kg" } },
        { activityIndex: 1, weight: null },
      ]);
      // The second Bench row has no alternatives to match.
      expect(
        getAlternativeWeightHints(
          db,
          "p",
          source,
          parents,
          1,
          [{ exerciseId: "g", loadType: "RPE" }],
          "Main",
        ),
      ).toEqual([{ activityIndex: 0, weight: null }]);
    } finally {
      db.raw.close();
    }
  });

  it("completes a session without using its alternatives", () => {
    const db = createTestDb(seed);
    setDatabase(db);
    const value = draft();
    for (const activity of value.activities)
      activity.mainSets = [
        set(`${activity.id}-m`, { status: "Done", actualReps: 5 }),
      ];
    createPlannedSession(db, "p", "s", value, null, 1);
    db.raw.exec("UPDATE sessions SET status = 'Ready', start_ms = 1");
    expect(
      readProgramInsightFacts(db, "p")?.sets.map((item) => item.activityId),
    ).toEqual([]);
    expect(completeSession("p", "s")).toBe(true);
    expect(
      db.raw
        .prepare(
          "SELECT activity_id AS id, status FROM workout_sets WHERE activity_id IN ('a1', 'a2') ORDER BY activity_id",
        )
        .all(),
    ).toEqual([
      { id: "a1", status: "Incomplete" },
      { id: "a2", status: "Incomplete" },
    ]);
  });

  it("round-trips alternatives through a backup and restores older backups", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const data = buildPortableDataV2(readPortableFactsV2(db));
      expect(
        data.programs[0]?.sessions[0]?.activities[0]?.alternatives.map(
          (item) => item.id,
        ),
      ).toEqual(["a1", "a2"]);
      const backup = serializePortableBackupV2(data, 5);
      expect(JSON.parse(backup)).toMatchObject({ version: 4 });
      const restored = createTestDb();
      try {
        transaction(restored, () =>
          replaceDomainData(restored, prepareApplicationRestore(backup)),
        );
        expect(buildPortableDataV2(readPortableFactsV2(restored))).toEqual(
          data,
        );
        // A version-2 backup has no alternatives field.
        const older = JSON.parse(backup) as {
          version: number;
          data: { programs: { sessions: { activities: object[] }[] }[] };
        };
        older.version = 2;
        for (const program of older.data.programs)
          for (const session of program.sessions)
            session.activities = session.activities.map((activity) => {
              const {
                alternatives: _dropped,
                supersets: _new,
                ...rest
              } = activity as {
                alternatives: unknown;
                supersets: unknown;
              };
              return rest;
            });
        const prepared = prepareApplicationRestore(JSON.stringify(older));
        expect(
          prepared.history.activities.every(
            (item) => item.parent_activity_id === null,
          ),
        ).toBe(true);
      } finally {
        restored.raw.close();
      }
    } finally {
      db.raw.close();
    }
  });

  it("plans the most used of an activity and its alternatives from the last 5 sessions", () => {
    const db = createTestDb(seed);
    try {
      db.raw.exec(
        "INSERT INTO session_lineages (program_id, id) VALUES ('p', 'l')",
      );
      // Oldest first: the exercise at main in each finished session.
      const mains = ["g", "g", "g", "f", "f", "e"];
      for (const [index, main] of mains.entries()) {
        const id = `s${index}`;
        const value = draft();
        value.activities = [
          {
            ...row(`${id}-a`, main),
            supersets: [],
            alternatives: ["e", "f", "g"]
              .filter((exercise) => exercise !== main)
              .map((exercise) => row(`${id}-${exercise}`, exercise)),
          },
        ];
        createPlannedSession(db, "p", id, value, null, 1);
        db.raw.exec(
          `UPDATE sessions SET lineage_id = 'l', status = 'Done', start_ms = ${index + 1}, end_ms = ${index + 1} WHERE id = '${id}'`,
        );
      }
      const usage = getRecentMainUsage(db, "p", "s5");
      // The oldest session falls outside the last 5.
      expect(Object.fromEntries(usage)).toEqual({ e: 1, f: 2, g: 2 });
      const source = getSessionDetail(db, "p", "s5");
      if (!source) throw new Error("Missing session");
      let id = 0;
      const planned = createTemplateDraft(source, () => `new-${++id}`, usage);
      // f and g tie; the first in the source's order wins, and the former
      // main takes f's place among the alternatives.
      expect(planned.activities[0]?.exerciseId).toBe("f");
      expect(
        planned.activities[0]?.alternatives.map((item) => item.exerciseId),
      ).toEqual(["e", "g"]);
      // Without usage counts, the source's main stays main.
      expect(
        createTemplateDraft(source, () => `new-${++id}`).activities[0]
          ?.exerciseId,
      ).toBe("e");
    } finally {
      db.raw.close();
    }
  });

  it("reads insights for an alternative from sessions where it was performed", () => {
    const db = createTestDb(seed);
    try {
      db.raw.exec(
        "INSERT INTO session_lineages (program_id, id) VALUES ('p', 'l')",
      );
      // Earlier, Machine was swapped in and performed in Bench's place.
      const earlier = draft();
      earlier.activities = [
        {
          ...row("old", "g"),
          mainSets: [set("old-m", { status: "Done", actualReps: 9 })],
          supersets: [],
          alternatives: [row("old-e", "e")],
        },
      ];
      createPlannedSession(db, "p", "s0", earlier, null, 1);
      createPlannedSession(db, "p", "s1", draft(), null, 2);
      db.raw.exec(`
        UPDATE sessions SET lineage_id = 'l';
        UPDATE sessions SET status = 'Done', start_ms = 1, end_ms = 2 WHERE id = 's0';
        UPDATE sessions SET status = 'Ready', start_ms = 3 WHERE id = 's1';`);
      const main = readExerciseSeriesFacts(db, {
        programId: "p",
        sessionId: "s1",
        activityId: "a",
        setId: "a-m",
      });
      expect(main?.alternatives).toEqual([
        { activityId: "a1", exerciseName: "Dumbbell", setId: "a1-m" },
        { activityId: "a2", exerciseName: "Machine", setId: "a2-m" },
      ]);
      const alternative = readExerciseSeriesFacts(db, {
        programId: "p",
        sessionId: "s1",
        activityId: "a2",
        setId: "a2-m",
      });
      expect(alternative?.selection.exerciseName).toBe("Machine");
      expect(alternative?.sets.map((item) => item.id)).toEqual([
        "old-m",
        "a2-m",
      ]);
      expect(alternative?.alternatives).toEqual([]);
    } finally {
      db.raw.close();
    }
  });
});
