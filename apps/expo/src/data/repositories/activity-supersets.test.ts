import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DraftActivity,
  DraftAlternative,
  SessionDraft,
} from "./session-drafts";
import type { SetReference } from "./sets";
import { buildPortableDataV2, readPortableFactsV2 } from "../backup/export-v2";
import { serializePortableBackupV2 } from "../backup/portable-v2";
import { prepareApplicationRestore } from "../backup/prepare-restore";
import { transaction } from "../database/db";
import { migrateDatabase, MIGRATIONS } from "../database/migrations";
import { createTestDb, nodeDb } from "../database/test-db";
import {
  draftFromSession,
  exerciseSelectionInput,
  newDraftSupersetMember,
  normalizeSuperset,
  swapAlternative,
} from "../domain/session-editor-draft";
import { replaceDomainData } from "../lifecycle/replace";
import { setDatabase } from "../store";
import { readExerciseSeriesFacts } from "./exercise-series";
import { getPlanningWeightHints } from "./planning-weights";
import { getSessionDetail, supersetSetOrder } from "./session-detail";
import { createPlannedSession, saveSessionDraft } from "./session-drafts";
import { getSetExecutionContext } from "./set-context";
import { completeSetAndAdvance, resetSet, startSet } from "./sets";
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
  restMinutes: 0,
  warmupSets: [set(`${id}-w0`)],
  mainSets: [set(`${id}-m0`), set(`${id}-m1`)],
});
/** Bench supersetted with Dumbbell (which has a Machine alternative), then Row. */
const draft = (): SessionDraft => ({
  name: "Day",
  deload: false,
  startMs: null,
  endMs: null,
  activities: [
    {
      ...row("a", "e"),
      alternatives: [],
      supersets: [{ ...row("b", "f"), alternatives: [row("b1", "g")] }],
    },
    { ...row("c", "h"), restMinutes: 2, alternatives: [], supersets: [] },
  ],
});
const seed = `
  INSERT INTO programs (id, name, position) VALUES ('p', 'Program', 0);
  INSERT INTO exercises (id, name, normalized_name, position)
    VALUES ('e', 'Bench', 'bench', 0), ('f', 'Dumbbell', 'dumbbell', 1),
      ('g', 'Machine', 'machine', 2), ('h', 'Row', 'row', 3);`;
const measured = { actualReps: 8, weight: null, feedback: "Neutral" as const };
const ref = (activityId: string, setId: string): SetReference => ({
  programId: "p",
  sessionId: "s",
  activityId,
  setId,
});

afterEach(() => setDatabase(undefined));

describe("activity supersets", () => {
  it("migrates an existing database without losing activities or sets", () => {
    const db = nodeDb(new DatabaseSync(":memory:"));
    db.raw.exec("PRAGMA foreign_keys = ON");
    try {
      migrateDatabase(db, MIGRATIONS.slice(0, 2));
      db.raw.exec(`${seed}
        INSERT INTO sessions (program_id, id, name, position, status, deload)
          VALUES ('p', 's', 'Day', 0, 'Planned', 0);
        INSERT INTO activities (program_id, session_id, id, parent_activity_id, exercise_id, position)
          VALUES ('p', 's', 'a', NULL, 'e', 0), ('p', 's', 'a1', 'a', 'f', 0);
        INSERT INTO workout_sets (program_id, session_id, activity_id, id, kind, position, status, feedback)
          VALUES ('p', 's', 'a1', 'w', 'Main', 0, 'Planned', 'Neutral');`);
      expect(transaction(db, () => migrateDatabase(db))).toBe(2);
      expect(
        db.raw
          .prepare(
            "SELECT id, parent_activity_id AS parent, superset_activity_id AS superset FROM activities ORDER BY id",
          )
          .all(),
      ).toEqual([
        { id: "a", parent: null, superset: null },
        { id: "a1", parent: "a", superset: null },
      ]);
      expect(db.raw.prepare("SELECT id FROM workout_sets").all()).toEqual([
        { id: "w" },
      ]);
      expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      // Deleting a leader removes its members, as for alternatives.
      db.raw.exec(`
        INSERT INTO activities (program_id, session_id, id, superset_activity_id, position)
          VALUES ('p', 's', 'm', 'a', 1);
        DELETE FROM activities WHERE id = 'a';`);
      expect(db.raw.prepare("SELECT id FROM activities").all()).toEqual([]);
      // A member is a main row, never an alternative.
      expect(() =>
        db.raw.exec(`
          INSERT INTO activities (program_id, session_id, id, position) VALUES ('p', 's', 'x', 0);
          INSERT INTO activities (program_id, session_id, id, parent_activity_id, superset_activity_id, position)
            VALUES ('p', 's', 'y', 'x', 'x', 0);`),
      ).toThrow();
    } finally {
      db.raw.close();
    }
  });

  it("stores members as main activities after their leader and reads them back", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      expect(
        db.raw
          .prepare(
            "SELECT id, parent_activity_id AS parent, superset_activity_id AS superset, position FROM activities ORDER BY parent_activity_id IS NOT NULL, position",
          )
          .all(),
      ).toEqual([
        { id: "a", parent: null, superset: null, position: 0 },
        { id: "b", parent: null, superset: "a", position: 1 },
        { id: "c", parent: null, superset: null, position: 2 },
        { id: "b1", parent: "b", superset: null, position: 0 },
      ]);
      const detail = getSessionDetail(db, "p", "s");
      if (!detail) throw new Error("Missing session");
      expect(detail.activities.map((item) => item.id)).toEqual(["a", "c"]);
      expect(detail.activities[0]?.supersets).toMatchObject([
        { id: "b", exerciseName: "Dumbbell", alternatives: [{ id: "b1" }] },
      ]);
      expect(draftFromSession(detail)).toEqual(draft());

      // Saving again replaces the superset like any other activity data.
      const next = draft();
      next.activities[0]?.supersets.splice(0, 1);
      saveSessionDraft(db, "p", "s", 0, next, false, 2);
      expect(getSessionDetail(db, "p", "s")?.activities[0]?.supersets).toEqual(
        [],
      );
    } finally {
      db.raw.close();
    }
  });

  it("rejects nested supersets", () => {
    const db = createTestDb(seed);
    try {
      const value = draft();
      const leader = value.activities[0];
      if (!leader) throw new Error("Missing activity");
      leader.supersets = [
        {
          ...row("b", "f"),
          alternatives: [],
          supersets: [],
        } as DraftActivity,
      ];
      expect(() => createPlannedSession(db, "p", "s", value, null, 1)).toThrow(
        "Superset exercises cannot have supersets.",
      );
    } finally {
      db.raw.close();
    }
  });

  it("performs a superset's sets alternately", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      // Only the leader's first warmup can start; the member's waits for it.
      expect(getSetExecutionContext(db, ref("a", "a-w0"))?.isStartable).toBe(
        true,
      );
      expect(getSetExecutionContext(db, ref("b", "b-w0"))?.isStartable).toBe(
        false,
      );
      expect(() => startSet(db, ref("b", "b-w0"), measured, 1)).toThrow(
        "Only the first pending set can be started.",
      );
      startSet(db, ref("a", "a-w0"), measured, 1);
      const order: (string | null)[] = [];
      let current: SetReference | null = ref("a", "a-w0");
      for (let step = 0; current && step < 10; step++) {
        const next = completeSetAndAdvance(db, current, measured, step + 2);
        order.push(next);
        current = next ? ref(next.split("-")[0] ?? "", next) : null;
      }
      // Each set number goes to the leader, then the member, warmups first.
      expect(order).toEqual(["b-w0", "a-m0", "b-m0", "a-m1", "b-m1", null]);
      // Other activities keep their own sequence.
      expect(getSetExecutionContext(db, ref("c", "c-w0"))?.isStartable).toBe(
        true,
      );

      // Resetting a set also resets the later sets of every superset row.
      resetSet(db, ref("a", "a-m1"), 20);
      expect(
        db.raw
          .prepare(
            "SELECT id, status FROM workout_sets WHERE activity_id IN ('a', 'b') ORDER BY id",
          )
          .all(),
      ).toEqual([
        { id: "a-m0", status: "Done" },
        { id: "a-m1", status: "Planned" },
        { id: "a-w0", status: "Done" },
        { id: "b-m0", status: "Done" },
        { id: "b-m1", status: "Planned" },
        { id: "b-w0", status: "Done" },
      ]);
      expect(getSetExecutionContext(db, ref("a", "a-m1"))?.isStartable).toBe(
        true,
      );
    } finally {
      db.raw.close();
    }
  });

  it("reads insights for a member and its alternatives like a main activity", () => {
    const db = createTestDb(seed);
    try {
      const earlier = draft();
      const member = earlier.activities[0]?.supersets[0];
      if (!member) throw new Error("Missing member");
      member.mainSets = [set("old-m0", { status: "Done", actualReps: 9 })];
      for (const activity of earlier.activities)
        for (const main of [activity, ...activity.supersets]) {
          main.id = `old-${main.id}`;
          main.warmupSets = main.warmupSets.map((item) => ({
            ...item,
            id: `old-${item.id}`,
          }));
          main.alternatives = main.alternatives.map((item) => ({
            ...item,
            id: `old-${item.id}`,
          }));
        }
      createPlannedSession(db, "p", "s0", earlier, null, 1);
      createPlannedSession(db, "p", "s", draft(), null, 2);
      db.raw.exec(`
        INSERT INTO session_lineages (program_id, id) VALUES ('p', 'l');
        UPDATE sessions SET lineage_id = 'l';
        UPDATE sessions SET status = 'Done', start_ms = 1, end_ms = 2 WHERE id = 's0';`);
      const facts = readExerciseSeriesFacts(db, ref("b", "b-m0"));
      expect(facts?.selection).toMatchObject({
        exerciseName: "Dumbbell",
        superset: true,
      });
      // The leader and a member's alternative are in the superset too; an
      // activity outside it is not.
      for (const [activityId, setId, superset] of [
        ["a", "a-m0", true],
        ["b1", "b1-m0", true],
        ["c", "c-m0", false],
      ] as const)
        expect(
          readExerciseSeriesFacts(db, ref(activityId, setId))?.selection
            .superset,
        ).toBe(superset);
      expect(facts?.sets.map((item) => item.id)).toEqual([
        "old-m0",
        "old-b-w0",
        "b-m0",
        "b-m1",
        "b-w0",
      ]);
      expect(facts?.alternatives).toEqual([
        { activityId: "b1", exerciseName: "Machine", setId: "b1-m0" },
      ]);

      // Weight hints treat members as main rows in stored order.
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = 50, weight_unit = 'lbs' WHERE id = 'old-m0'",
      );
      const mains = draft().activities.flatMap((item) => [
        item,
        ...item.supersets,
      ]);
      expect(
        getPlanningWeightHints(
          db,
          "p",
          { kind: "template", sessionId: "s0" },
          mains,
          "Main",
        ),
      ).toEqual([
        { activityIndex: 0, weight: null },
        { activityIndex: 1, weight: { value: 50, unit: "lbs" } },
        { activityIndex: 2, weight: null },
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("plans a template's supersets forward", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const source = getSessionDetail(db, "p", "s");
      if (!source) throw new Error("Missing session");
      let id = 0;
      const planned = createTemplateDraft(
        source,
        () => `new-${++id}`,
        new Map([["g", 3]]),
      );
      // The member's most used exercise is planned as the member.
      expect(planned.activities[0]?.supersets).toMatchObject([
        { exerciseId: "g", alternatives: [{ exerciseId: "f" }] },
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("round-trips supersets through a backup", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const data = buildPortableDataV2(readPortableFactsV2(db));
      expect(
        data.programs[0]?.sessions[0]?.activities.map((item) => [
          item.id,
          item.supersets.map((member) => member.id),
        ]),
      ).toEqual([
        ["a", ["b"]],
        ["c", []],
      ]);
      const backup = serializePortableBackupV2(data, 5);
      const restored = createTestDb();
      try {
        transaction(restored, () =>
          replaceDomainData(restored, prepareApplicationRestore(backup)),
        );
        expect(buildPortableDataV2(readPortableFactsV2(restored))).toEqual(
          data,
        );
      } finally {
        restored.raw.close();
      }
    } finally {
      db.raw.close();
    }
  });
});

describe("superset drafts", () => {
  let ids = 0;
  const createId = () => `id-${++ids}`;

  it("keeps members aligned to the leader's set counts with no rest", () => {
    const leader: DraftActivity = {
      ...row("a", "e"),
      restMinutes: 3,
      alternatives: [{ ...row("a1", "g"), restMinutes: 2 }],
      supersets: [],
    };
    const member = newDraftSupersetMember(leader, createId, undefined);
    expect(member).toMatchObject({ restMinutes: 0, alternatives: [] });
    expect([member.warmupSets.length, member.mainSets.length]).toEqual([1, 2]);

    const grown = normalizeSuperset(
      {
        ...leader,
        mainSets: [...leader.mainSets, set("a-m2")],
        supersets: [{ ...member, alternatives: [row("b1", "g")] }],
      },
      createId,
      undefined,
    );
    expect(grown.restMinutes).toBe(0);
    expect(grown.alternatives[0]?.restMinutes).toBe(0);
    expect(grown.supersets[0]?.mainSets).toHaveLength(3);
    expect(grown.supersets[0]?.alternatives[0]?.mainSets).toHaveLength(3);
    // Without members (or the switch) nothing changes.
    expect(normalizeSuperset(leader, createId, undefined)).toBe(leader);
    expect(
      normalizeSuperset(leader, createId, undefined, true).restMinutes,
    ).toBe(0);
  });

  it("swaps alternatives in for members and keeps a leader's supersets", () => {
    const value = draft().activities[0];
    if (!value) throw new Error("Missing activity");
    const member = value.supersets[0];
    if (!member) throw new Error("Missing member");
    expect(swapAlternative(member, "b1")).toMatchObject({
      id: "b1",
      alternatives: [{ id: "b" }],
    });
    const withAlternative = { ...value, alternatives: [row("a1", "h")] };
    const swapped = swapAlternative(withAlternative, "a1");
    expect(swapped?.supersets).toBe(value.supersets);
    expect(swapped?.alternatives.map((item) => "supersets" in item)).toEqual([
      false,
    ]);
  });

  it("offers each superset row its own alternatives and hides the rest", () => {
    const value = draft().activities[0];
    if (!value) throw new Error("Missing activity");
    const name = (id: string) => id.toUpperCase();
    expect(exerciseSelectionInput(value, "a", name)).toEqual({
      alternatives: [],
      excludeExerciseIds: ["f", "g"],
    });
    expect(exerciseSelectionInput(value, "b", name)).toEqual({
      alternatives: [{ activityId: "b1", exerciseId: "g", name: "G" }],
      excludeExerciseIds: ["g", "e"],
    });
    expect(exerciseSelectionInput(value, "b1", name, ["x"])).toEqual({
      alternatives: [],
      excludeExerciseIds: ["e", "f", "x"],
    });
  });

  it("orders a superset's sets alternately, warmups first", () => {
    const value = draft().activities[0];
    if (!value) throw new Error("Missing activity");
    expect(
      supersetSetOrder([value, ...value.supersets]).map(
        ({ row: item, set: entry, kind, index }) =>
          `${item.id}:${kind}:${index}:${entry.id}`,
      ),
    ).toEqual([
      "a:Warmup:0:a-w0",
      "b:Warmup:0:b-w0",
      "a:Main:0:a-m0",
      "b:Main:0:b-m0",
      "a:Main:1:a-m1",
      "b:Main:1:b-m1",
    ]);
  });
});
