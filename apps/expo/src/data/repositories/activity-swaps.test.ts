import { describe, expect, it } from "vitest";

import type { Db } from "../database/db";
import type {
  DraftActivity,
  DraftAlternative,
  DraftSet,
  SessionDraft,
} from "./session-drafts";
import type { SetReference } from "./sets";
import { createTestDb } from "../database/test-db";
import { buildExerciseSeriesProjection } from "../domain/exercise-series";
import { buildProgramInsightProjection } from "../domain/program-insights";
import {
  draftFromSession,
  normalizeSuperset,
  swapAlternative,
} from "../domain/session-editor-draft";
import { readExerciseSeriesFacts } from "./exercise-series";
import { readProgramInsightFacts } from "./program-insights";
import { getSessionDetail } from "./session-detail";
import { createPlannedSession, saveSessionDraft } from "./session-drafts";
import { cleanupInactiveSessions, completeSession } from "./session-lifecycle";
import { getSetExecutionContext } from "./set-context";
import { completeSetAndAdvance, resetSet, startSet } from "./sets";

const set = (id: string, overrides: Partial<DraftSet> = {}): DraftSet => ({
  id,
  status: "Planned",
  feedback: "Neutral",
  actualReps: 0,
  weightValue: 100,
  weightUnit: "lbs",
  startMs: null,
  endMs: null,
  ...overrides,
});
const done = (id: string, reps = 8) =>
  set(id, { status: "Done", actualReps: reps, startMs: 1, endMs: 2 });
const row = (
  id: string,
  exerciseId: string,
  mainSets = [set(`${id}-m0`), set(`${id}-m1`)],
): DraftAlternative => ({
  id,
  exerciseId,
  reps: 10,
  loadType: "RPE",
  loadValue: 8,
  restMinutes: 2,
  dropPercent: null,
  warmupSets: [],
  mainSets,
  dropSets: [],
});
const activity = (
  main: DraftAlternative,
  alternatives: DraftAlternative[] = [],
): DraftActivity => ({ ...main, alternatives, supersets: [] });
const draft = (activities: DraftActivity[]): SessionDraft => ({
  name: "Day",
  deload: false,
  startMs: null,
  endMs: null,
  activities,
});
const measured = {
  actualReps: 8,
  weight: { value: 100, unit: "lbs" as const },
  feedback: "Hard" as const,
};
const ref = (
  activityId: string,
  setId: string,
  sessionId = "s",
): SetReference => ({ programId: "p", sessionId, activityId, setId });
let ids = 0;
const createId = () => `new-${++ids}`;

function setup() {
  const db = createTestDb(`
    INSERT INTO programs (id, name, position) VALUES ('p', 'Program', 0);
    INSERT INTO session_lineages (program_id, id) VALUES ('p', 'l');
    INSERT INTO exercises (id, name, normalized_name, position, load_kind)
      VALUES ('e', 'Bench', 'bench', 0, 'BARBELL'), ('f', 'Dumbbell', 'dumbbell', 1, 'SINGLE_WEIGHT');
    INSERT INTO muscle_labels (id, name, normalized_name)
      VALUES (901, 'Bench Muscle', 'bench muscle'), (902, 'Dumbbell Muscle', 'dumbbell muscle');
    INSERT INTO exercise_muscles (exercise_id, muscle_id, position) VALUES ('e', 901, 0), ('f', 902, 0);`);
  return db;
}
function plan(db: Db, sessionId: string, activities: DraftActivity[]) {
  createPlannedSession(db, "p", sessionId, draft(activities), null, 1);
  db.runSync(
    "UPDATE sessions SET lineage_id = 'l' WHERE id = ? AND program_id = 'p'",
    sessionId,
  );
}
/** Swap through the session form's own steps: open a draft, swap and save. */
function swap(db: Db, mainId: string, alternativeId: string) {
  const session = getSessionDetail(db, "p", "s");
  if (!session) throw new Error("Missing session");
  const value = draftFromSession(session);
  value.activities = value.activities.map((item) => {
    if (item.id !== mainId) return item;
    const swapped = swapAlternative(item, alternativeId, createId, undefined);
    if (!swapped) throw new Error("Missing alternative");
    return normalizeSuperset(swapped, createId, undefined);
  });
  saveSessionDraft(db, "p", "s", session.revision, value, false, 50);
}
function points(db: Db, reference: SetReference) {
  const facts = readExerciseSeriesFacts(db, reference);
  if (!facts) throw new Error("Missing facts");
  return buildExerciseSeriesProjection(facts, 100).series.map((item) =>
    item.points.map((point) => [
      point.sessionId,
      point.reps,
      point.volumeLbs,
      point.notStarted ? "pending" : point.completed ? "done" : "none",
    ]),
  );
}
function program(db: Db) {
  const facts = readProgramInsightFacts(db, "p");
  if (!facts) throw new Error("Missing facts");
  return Object.fromEntries(
    buildProgramInsightProjection(facts, 100).weeks.flatMap((week) =>
      week.muscleGroups.map((group) => [
        group.muscleGroup,
        [group.volumeLbs, group.pending.volumeLbs],
      ]),
    ),
  );
}

describe("insights after swapping in an alternative", () => {
  it("counts pending sets only for the selected exercise", () => {
    const db = setup();
    try {
      plan(db, "s", [activity(row("a", "e"), [row("a1", "f")])]);
      swap(db, "a", "a1");
      expect(program(db)).toEqual({ "Dumbbell Muscle": [0, 2000] });
      expect(points(db, ref("a1", "a1-m0"))).toEqual([
        [["s", 10, 1000, "pending"]],
        [["s", 10, 1000, "pending"]],
      ]);
      expect(points(db, ref("a", "a-m0"))).toEqual([
        [["s", 0, 0, "none"]],
        [["s", 0, 0, "none"]],
      ]);
      // An alternative that was never selected isn't pending either, until it is.
      swap(db, "a1", "a");
      expect(program(db)).toEqual({ "Bench Muscle": [0, 2000] });
      expect(points(db, ref("a1", "a1-m0"))[0]).toEqual([["s", 0, 0, "none"]]);
      expect(points(db, ref("a", "a-m0"))[0]).toEqual([
        ["s", 10, 1000, "pending"],
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("counts sets completed before the swap, and nothing else of the exercise", () => {
    const db = setup();
    try {
      plan(db, "s", [activity(row("a", "e"), [row("a1", "f")])]);
      startSet(db, ref("a", "a-m0"), measured, 10);
      // Completing a set starts the next one, which is left running.
      expect(completeSetAndAdvance(db, ref("a", "a-m0"), measured, 20)).toBe(
        "a-m1",
      );
      db.raw.exec("UPDATE workout_sets SET actual_reps = 3 WHERE id = 'a-m1'");
      swap(db, "a", "a1");
      expect(program(db)).toEqual({
        "Bench Muscle": [800, 0],
        "Dumbbell Muscle": [0, 2000],
      });
      expect(points(db, ref("a", "a-m0"))).toEqual([
        [["s", 8, 800, "done"]],
        // Running, but not completed.
        [["s", 0, 0, "none"]],
      ]);
      // A later session's history has the completed set too.
      plan(db, "s2", [activity(row("n", "e", [set("n-m0")]))]);
      expect(points(db, ref("n", "n-m0", "s2"))).toEqual([
        [
          ["s", 8, 800, "done"],
          ["s2", 10, 1000, "pending"],
        ],
      ]);
    } finally {
      db.raw.close();
    }
  });

  it("matches repeated exercises to the activities they were performed in", () => {
    const db = setup();
    try {
      // Bench twice; the first was swapped out after one set.
      plan(db, "s", [
        activity(row("a1", "f"), [row("a", "e", [done("a-m0", 5)])]),
        activity(row("b", "e", [done("b-m0", 9)])),
      ]);
      plan(db, "s2", [
        activity(row("x", "e", [set("x-m0")])),
        activity(row("y", "e", [set("y-m0")])),
      ]);
      const first = (activityId: string) =>
        points(db, ref(activityId, `${activityId}-m0`, "s2"))[0]?.[0];
      expect(first("x")).toEqual(["s", 5, 500, "done"]);
      expect(first("y")).toEqual(["s", 9, 900, "done"]);
      // And back: the second Bench is still the second.
      expect(points(db, ref("b", "b-m0"))[0]?.[0]).toEqual([
        "s",
        9,
        900,
        "done",
      ]);
      // An alternative that wasn't performed doesn't shift them.
      db.raw.exec(
        "UPDATE workout_sets SET status = 'Planned', actual_reps = 0 WHERE activity_id = 'a'",
      );
      expect(first("x")).toEqual(["s", 9, 900, "done"]);
    } finally {
      db.raw.close();
    }
  });
});

describe("sets performed as an alternative", () => {
  /** Each series' points as [session, volume, feedback, alternative]. */
  function shown(db: Db, reference: SetReference) {
    const facts = readExerciseSeriesFacts(db, reference);
    if (!facts) throw new Error("Missing facts");
    return buildExerciseSeriesProjection(facts, 100).series.map((item) =>
      item.points.map((point) => [
        point.sessionId,
        point.volumeLbs,
        point.feedback,
        point.alternativeName,
      ]),
    );
  }
  const hard = (id: string, reps: number) => ({
    ...done(id, reps),
    feedback: "Hard" as const,
  });

  it("stand in for the sets of an exercise that was swapped out", () => {
    const db = setup();
    try {
      // Bench had one set completed, then Dumbbell was performed in its place.
      plan(db, "s0", [
        activity(
          row("f0", "f", [hard("f0-m0", 5), hard("f0-m1", 6), set("f0-m2")]),
          [row("e0", "e", [done("e0-m0"), set("e0-m1"), set("e0-m2")])],
        ),
      ]);
      // Bench wasn't performed at all.
      plan(db, "s1", [
        activity(row("f1", "f", [done("f1-m0", 7)]), [row("e1", "e")]),
      ]);
      // Neither was performed, and an unrelated activity isn't an alternative.
      plan(db, "s2", [
        activity(row("f2", "f"), [row("e2", "e")]),
        activity(row("x2", "f", [done("x2-m0")])),
      ]);
      plan(db, "s", [
        activity(row("a", "e", [set("a-m0"), set("a-m1"), set("a-m2")]), [
          row("a1", "f"),
        ]),
      ]);
      expect(shown(db, ref("a", "a-m0"))).toEqual([
        [
          ["s0", 800, "Neutral", undefined],
          ["s1", 700, "Neutral", "Dumbbell"],
          ["s2", 0, null, undefined],
          ["s", 1000, "Neutral", undefined],
        ],
        [
          ["s0", 600, "Hard", "Dumbbell"],
          ["s1", 0, null, undefined],
          ["s2", 0, null, undefined],
          ["s", 1000, "Neutral", undefined],
        ],
        [
          ["s0", 0, null, undefined],
          ["s1", 0, null, undefined],
          ["s2", 0, null, undefined],
          ["s", 1000, "Neutral", undefined],
        ],
      ]);
      // Program insights count each set once.
      expect(program(db)).toMatchObject({ "Bench Muscle": [800, 3000] });
    } finally {
      db.raw.close();
    }
  });

  it("stand in for the current session's, but never for its pending sets", () => {
    const db = setup();
    try {
      plan(db, "s", [
        activity(row("a1", "f", [done("a1-m0", 6), set("a1-m1")]), [
          row("a", "e"),
        ]),
      ]);
      expect(shown(db, ref("a", "a-m0"))).toEqual([
        [["s", 600, "Neutral", "Dumbbell"]],
        [["s", 0, null, undefined]],
      ]);
      swap(db, "a1", "a");
      expect(shown(db, ref("a", "a-m0"))).toEqual([
        [["s", 1000, "Neutral", undefined]],
        [["s", 1000, "Neutral", undefined]],
      ]);
    } finally {
      db.raw.close();
    }
  });
});

describe("skipped sets", () => {
  it("are not pending once their session has finished", () => {
    const db = setup();
    try {
      plan(db, "s", [activity(row("a", "e"))]);
      startSet(db, ref("a", "a-m0"), measured, 10);
      completeSetAndAdvance(db, ref("a", "a-m0"), measured, 20);
      expect(points(db, ref("a", "a-m0"))[1]).toEqual([
        ["s", 10, 1000, "pending"],
      ]);
      completeSession(db, "p", "s", 30, 30);
      expect(points(db, ref("a", "a-m0"))).toEqual([
        [["s", 8, 800, "done"]],
        [["s", 0, 0, "none"]],
      ]);
      expect(program(db)).toEqual({ "Bench Muscle": [800, 0] });
    } finally {
      db.raw.close();
    }
  });
});

describe("finishing a session with a swapped-out exercise", () => {
  /** One Bench set done, the next filled out, and one reset; then swapped. */
  function swapped(db: Db) {
    plan(db, "s", [
      activity(row("a", "e", [set("a-m0"), set("a-m1"), set("a-m2")]), [
        row("a1", "f"),
      ]),
    ]);
    startSet(db, ref("a", "a-m0"), measured, 10);
    completeSetAndAdvance(db, ref("a", "a-m0"), measured, 20);
    completeSetAndAdvance(db, ref("a", "a-m1"), measured, 30);
    // Resetting a set keeps its reps.
    resetSet(db, ref("a", "a-m1"), 35);
    startSet(db, ref("a", "a-m1"), measured, 40);
    db.runSync("UPDATE workout_sets SET actual_reps = 8 WHERE id = 'a-m2'");
    swap(db, "a", "a1");
    startSet(db, ref("a1", "a1-m0"), measured, 60);
  }
  const statuses = (db: Db) =>
    db.getAllSync(
      "SELECT id, status, actual_reps AS reps, start_ms AS startMs, end_ms AS endMs FROM workout_sets ORDER BY id",
    );

  for (const [name, finish] of [
    ["completed", (db: Db) => completeSession(db, "p", "s", 100, 100)],
    ["timed out", (db: Db) => cleanupInactiveSessions(db, 100_000_000)],
    [
      "timed out, then acknowledged",
      (db: Db) => {
        cleanupInactiveSessions(db, 100_000_000);
        completeSession(db, "p", "s", null, 100_000_000);
      },
    ],
  ] as const)
    it(`keeps only its sets marked done when ${name}`, () => {
      const db = setup();
      try {
        swapped(db);
        finish(db);
        expect(statuses(db)).toMatchObject([
          { id: "a-m0", status: "Done", reps: 8 },
          { id: "a-m1", status: "Incomplete", reps: 8, startMs: 40 },
          {
            id: "a-m2",
            status: "Incomplete",
            reps: 8,
            startMs: null,
            endMs: null,
          },
          // The selected exercise's filled out sets still count.
          { id: "a1-m0", status: "Done", reps: 8 },
          { id: "a1-m1", status: "Incomplete", reps: 0 },
        ]);
        expect(program(db)).toEqual({
          "Bench Muscle": [800, 0],
          "Dumbbell Muscle": [800, 0],
        });
        // Nor do they count in the finished session once swapped back.
        swap(db, "a1", "a");
        expect(points(db, ref("a", "a-m0"))).toEqual([
          [["s", 8, 800, "done"]],
          [["s", 0, 0, "none"]],
          [["s", 0, 0, "none"]],
        ]);
        expect(program(db)).toEqual({
          "Bench Muscle": [800, 0],
          "Dumbbell Muscle": [800, 0],
        });
      } finally {
        db.raw.close();
      }
    });
});

describe("switching back to a partially completed exercise", () => {
  const sets = (db: Db, activityId: string) =>
    db.getAllSync(
      "SELECT * FROM workout_sets WHERE activity_id = ? ORDER BY position",
      activityId,
    );

  it("restores its sets and continues from the one that was running", () => {
    const db = setup();
    try {
      plan(db, "s", [
        activity(row("a", "e", [set("a-m0"), set("a-m1"), set("a-m2")]), [
          row("a1", "f"),
        ]),
      ]);
      startSet(db, ref("a", "a-m0"), measured, 10);
      completeSetAndAdvance(db, ref("a", "a-m0"), measured, 20);
      const before = sets(db, "a");
      expect(before).toMatchObject([
        { status: "Done", actual_reps: 8, feedback: "Hard" },
        { status: "Ready", start_ms: 20 },
        { status: "Planned" },
      ]);

      // The alternative starts fresh and can be worked on meanwhile.
      swap(db, "a", "a1");
      expect(getSetExecutionContext(db, ref("a1", "a1-m0"))?.isStartable).toBe(
        true,
      );
      startSet(db, ref("a1", "a1-m0"), measured, 60);
      completeSetAndAdvance(db, ref("a1", "a1-m0"), measured, 70);
      const other = sets(db, "a1");
      expect(sets(db, "a")).toEqual(before);

      swap(db, "a1", "a");
      expect(sets(db, "a")).toEqual(before);
      expect(sets(db, "a1")).toEqual(other);
      expect(completeSetAndAdvance(db, ref("a", "a-m1"), measured, 90)).toBe(
        "a-m2",
      );
      expect(completeSetAndAdvance(db, ref("a", "a-m2"), measured, 95)).toBe(
        null,
      );
      // Both exercises' completed sets count; only Bench could still be pending.
      expect(program(db)).toEqual({
        "Bench Muscle": [2400, 0],
        "Dumbbell Muscle": [800, 0],
      });
    } finally {
      db.raw.close();
    }
  });

  it("keeps superset members' completed sets when the leader has fewer sets meanwhile", () => {
    const db = setup();
    try {
      const member = { ...row("b", "f", [done("b-m0"), done("b-m1")]) };
      const memberAlternative = row("b1", "f", [done("b1-m0"), set("b1-m1")]);
      plan(db, "s", [
        {
          ...row("a", "e", [done("a-m0"), done("a-m1")]),
          alternatives: [row("a1", "e", [set("a1-m0")])],
          supersets: [{ ...member, alternatives: [memberAlternative] }],
        },
      ]);
      const before = [sets(db, "a"), sets(db, "b"), sets(db, "b1")];
      swap(db, "a", "a1");
      // One more set for the swapped-in leader, to go with the members'.
      expect(sets(db, "a1")).toMatchObject([
        { id: "a1-m0", status: "Planned" },
        { status: "Planned", weight_value: 100 },
      ]);
      swap(db, "a1", "a");
      expect([sets(db, "a"), sets(db, "b"), sets(db, "b1")]).toEqual(before);
    } finally {
      db.raw.close();
    }
  });
});
