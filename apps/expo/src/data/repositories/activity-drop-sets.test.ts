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
import { buildExerciseSeriesProjection } from "../domain/exercise-series";
import { buildProgramInsightProjection } from "../domain/program-insights";
import {
  activityErrors,
  applyLoadSelection,
  draftFromSession,
  newDraftActivity,
  newDraftSupersetMember,
  normalizeSuperset,
  resizeSets,
  swapAlternative,
} from "../domain/session-editor-draft";
import { plannedDropSetWeight } from "../domain/set-execution";
import { replaceDomainData } from "../lifecycle/replace";
import { setDatabase } from "../store";
import { readExerciseSeriesFacts } from "./exercise-series";
import { readProgramInsightFacts } from "./program-insights";
import { getSessionDetail, supersetSetOrder } from "./session-detail";
import { createPlannedSession } from "./session-drafts";
import { getSetExecutionContext } from "./set-context";
import {
  completeSetAndAdvance,
  patchSetRecording,
  resetSet,
  startSet,
} from "./sets";
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
/** One warmup, two main sets and two 20% drop sets. */
const row = (id: string, exerciseId: string): DraftAlternative => ({
  id,
  exerciseId,
  reps: 8,
  loadType: "PERCENT",
  loadValue: 0.75,
  restMinutes: 0,
  dropPercent: 0.2,
  warmupSets: [set(`${id}-w0`)],
  mainSets: [set(`${id}-m0`), set(`${id}-m1`)],
  dropSets: [set(`${id}-d0`), set(`${id}-d1`)],
});
/** Bench with drop sets, supersetted with Fly, then Row without any. */
const draft = (): SessionDraft => ({
  name: "Day",
  deload: false,
  startMs: null,
  endMs: null,
  activities: [
    {
      ...row("a", "e"),
      alternatives: [],
      supersets: [{ ...row("b", "f"), alternatives: [] }],
    },
    {
      ...row("c", "h"),
      restMinutes: 2,
      dropPercent: null,
      dropSets: [],
      alternatives: [],
      supersets: [],
    },
  ],
});
const seed = `
  INSERT INTO programs (id, name, position) VALUES ('p', 'Program', 0);
  INSERT INTO exercises (id, name, normalized_name, position, one_rep_max_value, one_rep_max_unit)
    VALUES ('e', 'Bench', 'bench', 0, 200, 'lbs'), ('f', 'Fly', 'fly', 1, 100, 'lbs'),
      ('h', 'Row', 'row', 2, NULL, NULL);`;
const measured = { actualReps: 8, weight: null, feedback: "Neutral" as const };
const ref = (activityId: string, setId: string): SetReference => ({
  programId: "p",
  sessionId: "s",
  activityId,
  setId,
});

afterEach(() => setDatabase(undefined));

describe("activity drop sets", () => {
  it("migrates an existing database without losing activities or sets", () => {
    const db = nodeDb(new DatabaseSync(":memory:"));
    db.raw.exec("PRAGMA foreign_keys = ON");
    try {
      migrateDatabase(db, MIGRATIONS.slice(0, 3));
      db.raw.exec(`${seed}
        INSERT INTO sessions (program_id, id, name, position, status, deload)
          VALUES ('p', 's', 'Day', 0, 'Planned', 0);
        INSERT INTO activities (program_id, session_id, id, exercise_id, position)
          VALUES ('p', 's', 'a', 'e', 0);
        INSERT INTO workout_sets (program_id, session_id, activity_id, id, kind, position, status, feedback)
          VALUES ('p', 's', 'a', 'm', 'Main', 0, 'Planned', 'Neutral');`);
      expect(transaction(db, () => migrateDatabase(db))).toBe(3);
      expect(
        db.raw
          .prepare("SELECT id, drop_percent AS dropPercent FROM activities")
          .all(),
      ).toEqual([{ id: "a", dropPercent: null }]);
      expect(db.raw.prepare("SELECT id, kind FROM workout_sets").all()).toEqual(
        [{ id: "m", kind: "Main" }],
      );
      db.raw.exec(`
        UPDATE activities SET drop_percent = 0.2;
        INSERT INTO workout_sets (program_id, session_id, activity_id, id, kind, position, status, feedback)
          VALUES ('p', 's', 'a', 'd', 'Drop', 0, 'Planned', 'Neutral');`);
      expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      // A drop can take off nothing, but not everything.
      db.raw.exec("UPDATE activities SET drop_percent = 0");
      for (const value of [-0.1, 1])
        expect(() =>
          db.raw.exec(`UPDATE activities SET drop_percent = ${value}`),
        ).toThrow();
      // Sets still go with their activity.
      db.raw.exec("DELETE FROM activities");
      expect(db.raw.prepare("SELECT id FROM workout_sets").all()).toEqual([]);
    } finally {
      db.raw.close();
    }
  });

  it("allows a 0% drop on a database that already has drop sets", () => {
    const db = nodeDb(new DatabaseSync(":memory:"));
    db.raw.exec("PRAGMA foreign_keys = ON");
    try {
      migrateDatabase(db, MIGRATIONS.slice(0, 4));
      db.raw.exec(seed);
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const before = getSessionDetail(db, "p", "s");
      // Step 4 required a drop of more than 0.
      expect(() =>
        db.raw.exec("UPDATE activities SET drop_percent = 0 WHERE id = 'a'"),
      ).toThrow();
      expect(transaction(db, () => migrateDatabase(db))).toBe(4);
      // Every activity and set survives, superset and drop sets included.
      expect(getSessionDetail(db, "p", "s")).toEqual(before);
      expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      db.raw.exec("UPDATE activities SET drop_percent = 0 WHERE id = 'a'");
      // Indexes are rebuilt with the table: positions stay unique.
      expect(() =>
        db.raw.exec(
          "INSERT INTO activities (program_id, session_id, id, position) VALUES ('p', 's', 'x', 0)",
        ),
      ).toThrow();
      // Deleting a leader still removes its members and their sets.
      db.raw.exec("DELETE FROM activities WHERE id = 'a'");
      expect(
        db.raw
          .prepare(
            "SELECT DISTINCT activity_id AS id FROM workout_sets ORDER BY id",
          )
          .all(),
      ).toEqual([{ id: "c" }]);
    } finally {
      db.raw.close();
    }
  });

  it("stores drop sets after the other sets and reads them back", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const detail = getSessionDetail(db, "p", "s");
      if (!detail) throw new Error("Missing session");
      expect(detail.activities[0]).toMatchObject({
        dropPercent: 0.2,
        dropSets: [{ id: "a-d0", kind: "Drop" }, { id: "a-d1" }],
        supersets: [{ dropPercent: 0.2, dropSets: [{}, {}] }],
      });
      expect(detail.activities[1]).toMatchObject({
        dropPercent: null,
        dropSets: [],
      });
      expect(draftFromSession(detail)).toEqual(draft());
      // A superset alternates drop sets like its other sets, after them.
      const leader = detail.activities[0];
      if (!leader) throw new Error("Missing activity");
      expect(
        supersetSetOrder([leader, ...leader.supersets]).map(
          ({ set: item }) => item.id,
        ),
      ).toEqual([
        "a-w0",
        "b-w0",
        "a-m0",
        "b-m0",
        "a-m1",
        "b-m1",
        "a-d0",
        "b-d0",
        "a-d1",
        "b-d1",
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("rejects an invalid drop percentage, but defaults a missing one", () => {
    const db = createTestDb(seed);
    try {
      for (const dropPercent of [-0.1, 1]) {
        const value = draft();
        const activity = value.activities[0];
        if (!activity) throw new Error("Missing activity");
        activity.dropPercent = dropPercent;
        expect(() =>
          createPlannedSession(db, "p", "s", value, null, 1),
        ).toThrow();
      }
      const value = draft();
      const activity = value.activities[0];
      if (!activity) throw new Error("Missing activity");
      activity.dropPercent = null;
      createPlannedSession(db, "p", "s", value, null, 1);
      // Without a percentage of its own, a drop set takes off the default 20%.
      expect(
        getSetExecutionContext(db, ref("a", "a-d0"))?.targetWeight,
      ).toEqual({ value: 120, unit: "lbs" });
    } finally {
      db.raw.close();
    }
  });

  it("performs drop sets last, alternating in a superset", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      startSet(db, ref("a", "a-w0"), measured, 1);
      const order: (string | null)[] = [];
      let current: SetReference | null = ref("a", "a-w0");
      for (let step = 0; current && step < 12; step++) {
        const next = completeSetAndAdvance(db, current, measured, step + 2);
        order.push(next);
        current = next ? ref(next.split("-")[0] ?? "", next) : null;
      }
      expect(order).toEqual([
        "b-w0",
        "a-m0",
        "b-m0",
        "a-m1",
        "b-m1",
        "a-d0",
        "b-d0",
        "a-d1",
        "b-d1",
        null,
      ]);

      // Resetting a main set resets the drop sets after it too.
      resetSet(db, ref("b", "b-m1"), 20);
      expect(
        db.raw
          .prepare(
            "SELECT id FROM workout_sets WHERE status = 'Planned' AND activity_id IN ('a', 'b') ORDER BY id",
          )
          .all(),
      ).toEqual(["a-d0", "a-d1", "b-d0", "b-d1", "b-m1"].map((id) => ({ id })));
      expect(getSetExecutionContext(db, ref("b", "b-m1"))?.isStartable).toBe(
        true,
      );
    } finally {
      db.raw.close();
    }
  });

  it("plans each drop set lighter than the set before it", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const target = (setId: string) =>
        getSetExecutionContext(db, ref("a", setId))?.targetWeight;
      // 75% of a 200 lb max is 150; each drop takes off 20%, to the nearest 5.
      expect(target("a-m1")).toEqual({ value: 150, unit: "lbs" });
      expect(target("a-d0")).toEqual({ value: 120, unit: "lbs" });
      expect(target("a-d1")).toEqual({ value: 95, unit: "lbs" });
      expect(
        getSetExecutionContext(db, ref("a", "a-d0"))?.activity,
      ).toMatchObject({ dropPercent: 0.2 });

      // Recorded weights replace planned ones for the sets that follow.
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = 160, weight_unit = 'lbs' WHERE id = 'a-m1'",
      );
      expect(target("a-d0")).toEqual({ value: 130, unit: "lbs" });
      db.raw.exec("UPDATE sessions SET status = 'Ready'");
      db.raw.exec(
        "UPDATE workout_sets SET status = 'Ready', start_ms = 1 WHERE id = 'a-d0'",
      );
      patchSetRecording(
        db,
        ref("a", "a-d0"),
        { weight: { value: 125, unit: "lbs" } },
        2,
      );
      expect(target("a-d1")).toEqual({ value: 100, unit: "lbs" });
    } finally {
      db.raw.close();
    }
  });

  it("tracks each drop set's progress in exercise insights", () => {
    const db = createTestDb(seed);
    try {
      // An earlier session did one drop set, recorded at 110 lbs for 6 reps.
      const earlier = draft();
      for (const activity of earlier.activities)
        for (const main of [activity, ...activity.supersets]) {
          main.id = `old-${main.id}`;
          for (const kind of ["warmupSets", "mainSets", "dropSets"] as const)
            main[kind] = main[kind].map((item) => ({
              ...item,
              id: `old-${item.id}`,
            }));
        }
      const old = earlier.activities[0];
      if (!old) throw new Error("Missing activity");
      old.dropSets = [
        set("old-a-d0", {
          status: "Done",
          actualReps: 6,
          weightValue: 110,
          weightUnit: "lbs",
          startMs: 1,
        }),
      ];
      createPlannedSession(db, "p", "s0", earlier, null, 1);
      createPlannedSession(db, "p", "s", draft(), null, 2);
      db.raw.exec(`
        INSERT INTO session_lineages (program_id, id) VALUES ('p', 'l');
        UPDATE sessions SET lineage_id = 'l';
        UPDATE sessions SET status = 'Done', start_ms = 1, end_ms = 2 WHERE id = 's0';`);
      const facts = readExerciseSeriesFacts(db, ref("a", "a-d1"));
      if (!facts) throw new Error("Missing insights");
      const projection = buildExerciseSeriesProjection(facts, 10);
      const drops = projection.series.filter((item) => item.setType === "Drop");
      expect(
        drops.map(({ setNumber, selected }) => [setNumber, selected]),
      ).toEqual([
        [1, false],
        [2, true],
      ]);
      // Drop Set 1 matches the earlier drop set; the current one is planned
      // 20% under the 150 lb main set.
      expect(
        drops[0]?.points.map(({ reps, weightLbs, current }) => ({
          reps,
          weightLbs,
          current,
        })),
      ).toEqual([
        { reps: 6, weightLbs: 110, current: false },
        { reps: 8, weightLbs: 120, current: true },
      ]);
      // The earlier session had no second drop set.
      expect(drops[1]?.points.map(({ weightLbs }) => weightLbs)).toEqual([
        0, 95,
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("counts drop sets in program insights like main sets, and on their own", () => {
    const db = createTestDb(seed);
    try {
      db.raw.exec(`
        INSERT INTO muscle_labels (id, name, normalized_name) VALUES (1, 'Chest', 'chest');
        INSERT INTO exercise_muscles (exercise_id, position, muscle_id) VALUES ('e', 0, 1);
        UPDATE exercises SET load_kind = 'BARBELL' WHERE id = 'e';`);
      // Bench alone: two main sets at 75% of 200 lbs, two 20% drop sets.
      const plan = draft();
      plan.activities = plan.activities.slice(0, 1).map((item) => ({
        ...item,
        supersets: [],
      }));
      createPlannedSession(db, "p", "s", plan, null, 1);
      db.raw.exec(`
        UPDATE sessions SET status = 'Ready', start_ms = 1000;
        UPDATE workout_sets SET status = 'Done', actual_reps = 8,
          weight_value = 150, weight_unit = 'lbs'
          WHERE id IN ('a-m0', 'a-m1');
        UPDATE workout_sets SET status = 'Done', actual_reps = 6,
          weight_value = 120, weight_unit = 'lbs' WHERE id = 'a-d0';`);
      const facts = readProgramInsightFacts(db, "p");
      if (!facts) throw new Error("Missing program");
      const chest = buildProgramInsightProjection(facts, 2000).weeks[0]
        ?.muscleGroups[0];
      // Completed: two main sets and one drop set.
      expect(chest).toMatchObject({
        sets: 3,
        reps: 22,
        volumeLbs: 8 * 150 * 2 + 6 * 120,
        drop: { sets: 1, reps: 6, volumeLbs: 720 },
      });
      // Pending: the second drop set, planned 20% under the first's 120 lbs.
      expect(chest?.pending).toMatchObject({
        sets: 1,
        reps: 8,
        volumeLbs: 8 * 95,
      });
      expect(chest?.dropPending).toEqual(chest?.pending);
      expect(buildProgramInsightProjection(facts, 2000).partial).toBe(false);
    } finally {
      db.raw.close();
    }
  });

  it("plans a template's drop sets forward without weights", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = 100, weight_unit = 'lbs', status = 'Done'",
      );
      const source = getSessionDetail(db, "p", "s");
      if (!source) throw new Error("Missing session");
      let id = 0;
      const planned = createTemplateDraft(source, () => `new-${++id}`);
      expect(planned.activities[0]).toMatchObject({
        dropPercent: 0.2,
        dropSets: [
          { status: "Planned", weightValue: null },
          { status: "Planned", weightValue: null },
        ],
      });
    } finally {
      db.raw.close();
    }
  });

  it("round-trips drop sets through a backup", () => {
    const db = createTestDb(seed);
    try {
      createPlannedSession(db, "p", "s", draft(), null, 1);
      const data = buildPortableDataV2(readPortableFactsV2(db));
      expect(data.programs[0]?.sessions[0]?.activities[0]).toMatchObject({
        dropPercent: 0.2,
        dropSets: [{ id: "a-d0" }, { id: "a-d1" }],
      });
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

describe("drop set drafts", () => {
  let ids = 0;
  const createId = () => `id-${++ids}`;
  const activity = (): DraftActivity => ({
    ...newDraftActivity(createId, undefined),
    alternatives: [newDraftActivity(createId, undefined)].map(
      ({ alternatives: _a, supersets: _s, ...item }) => item,
    ),
  });

  /** `activity` with `count` drop sets at the default percentage. */
  const withDrops = <T extends DraftAlternative>(base: T, count = "1"): T => {
    const next = resizeSets(base, "Drop", count, createId, undefined);
    if (!next) throw new Error("Invalid count");
    return next.activity;
  };

  it("shares drop set counts across a superset, but not its alternatives", () => {
    const leader = withDrops(activity());
    const withMember = {
      ...leader,
      supersets: [
        {
          ...newDraftSupersetMember(leader, createId, undefined),
          dropPercent: 0.3,
        },
      ],
    };
    const grown = normalizeSuperset(
      withDrops(withMember, "3"),
      createId,
      undefined,
    );
    // The member follows the leader's count, keeping its own percentage.
    expect(
      [grown, ...grown.supersets].map((item) => [
        item.dropPercent,
        item.dropSets.length,
      ]),
    ).toEqual([
      [null, 3],
      [0.3, 3],
    ]);
    // The leader's alternative plans its own drop sets.
    expect(grown.alternatives[0]?.dropSets).toEqual([]);
    const alternative = grown.alternatives[0];
    if (!alternative) throw new Error("Missing alternative");
    expect(swapAlternative(grown, alternative.id)?.dropSets).toEqual([]);
  });

  it("applies a drop percentage chosen with the load", () => {
    const base = withDrops(activity());
    const load = { type: "RPE" as const, value: 9 };
    expect(applyLoadSelection(base, load, 0.25).dropPercent).toBe(0.25);
    // Without drop sets offered, the percentage stays as it was.
    expect(
      applyLoadSelection({ ...base, dropPercent: 0.3 }, load).dropPercent,
    ).toBe(0.3);
  });

  it("doesn't copy weights into new drop sets", () => {
    const base = withDrops({ ...activity(), loadType: "RPE" });
    const weighted = {
      ...base,
      dropSets: base.dropSets.map((item) => ({
        ...item,
        weightValue: 50,
        weightUnit: "lbs" as const,
      })),
    };
    const resized = resizeSets(weighted, "Drop", "2", createId, undefined);
    expect(resized?.activity.dropSets.map((item) => item.weightValue)).toEqual([
      50,
      null,
    ]);
  });

  it("requires a valid percentage with drop sets", () => {
    const on = withDrops(activity());
    expect(activityErrors(on).dropPercent).toBe(false);
    expect(activityErrors({ ...on, dropPercent: 0 }).dropPercent).toBe(false);
    expect(activityErrors({ ...on, dropPercent: 1 }).dropPercent).toBe(true);
    expect(activityErrors(activity()).dropPercent).toBe(false);
  });

  it("drops from the last main set, or else the last warmup set", () => {
    const weight = (value: number) => ({ value, unit: "lbs" as const });
    const rpe = {
      loadType: "RPE" as const,
      loadValue: 8,
      warmupSetCount: 1,
      dropPercent: 0.25,
    };
    expect(
      plannedDropSetWeight(
        rpe,
        [
          { kind: "Warmup", weight: weight(50) },
          { kind: "Main", weight: weight(100) },
          { kind: "Drop", weight: null },
        ],
        0,
        null,
      ),
    ).toEqual(weight(75));
    expect(
      plannedDropSetWeight(
        rpe,
        [
          { kind: "Warmup", weight: weight(100) },
          { kind: "Drop", weight: null },
          { kind: "Drop", weight: null },
        ],
        1,
        null,
      ),
    ).toEqual(weight(55));
    // Without a weight to drop from, there is nothing to plan.
    expect(
      plannedDropSetWeight(
        rpe,
        [
          { kind: "Main", weight: null },
          { kind: "Drop", weight: null },
        ],
        0,
        null,
      ),
    ).toBeNull();
    // A 0% drop repeats the weight exactly, without rounding to 5.
    expect(
      plannedDropSetWeight(
        { ...rpe, dropPercent: 0 },
        [
          { kind: "Main", weight: weight(47.5) },
          { kind: "Drop", weight: null },
          { kind: "Drop", weight: null },
        ],
        1,
        null,
      ),
    ).toEqual(weight(47.5));
    // Without a percentage of its own, a row drops by the default 20%.
    expect(
      plannedDropSetWeight(
        { ...rpe, dropPercent: null },
        [{ kind: "Main", weight: weight(100) }],
        0,
        null,
      ),
    ).toEqual(weight(80));
  });
});
