import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import type { Activity, WorkoutSet } from "@activity-log/ui/utils";
import { plannedWeightForWorkoutSet } from "@activity-log/ui/utils";

import { SCHEMA_V1 } from "../database/schema";
import { plannedSetWeight } from "../domain/set-execution";
import { getSetExecutionContext } from "./set-context";

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((database) => database.close()));

const reference = {
  programId: "p",
  sessionId: "s",
  activityId: "a",
  setId: "warmup",
};

function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
    INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);
    INSERT INTO session_lineages VALUES ('p', 'lineage'), ('other', 'lineage');
    INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, revision)
      VALUES ('p', 'previous', 'lineage', 'Previous', 0, 'Done', 0, 0),
             ('p', 's', 'lineage', 'Selected', 1, 'Planned', 1, 7),
             ('other', 's', 'lineage', 'Other', 0, 'Done', 0, 0);
    INSERT INTO exercises(id, name, normalized_name, position, load_kind, one_rep_max_value, one_rep_max_unit, deleted)
      VALUES ('e', 'Dumbbell press', 'dumbbellpress', 0, 'WEIGHT_PAIR', 100, 'kg', 1);
    INSERT INTO activities(program_id, session_id, id, exercise_id, position, reps, load_type, load_value, rest_minutes)
      VALUES ('p', 's', 'a', 'e', 0, 5, 'PERCENT', 0.8, 2.5),
             ('p', 's', 'repeated', 'e', 1, 12, 'RPE', 8, 1),
             ('other', 's', 'a', 'e', 0, 3, 'RPE', 9, 1);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, weight_value, weight_unit)
      VALUES ('p', 's', 'a', 'warmup', 'Warmup', 3, 'Planned', 'Neutral', NULL, NULL, NULL),
             ('p', 's', 'a', 'warmup-2', 'Warmup', 7, 'Planned', 'Neutral', NULL, NULL, NULL),
             ('p', 's', 'a', 'main', 'Main', 2, 'Planned', 'Hard', 5, 25, 'lbs'),
             ('p', 's', 'a', 'main-2', 'Main', 9, 'Planned', 'Easy', NULL, NULL, NULL),
             ('p', 's', 'repeated', 'warmup', 'Main', 0, 'Ready', 'Neutral', 12, 10, 'kg'),
             ('other', 's', 'a', 'warmup', 'Main', 0, 'Done', 'Easy', 3, 100, 'lbs');`);
  const calls: { sql: string; parameters: string[] }[] = [];
  const reader = {
    getFirstAsync: <T>(sql: string, ...parameters: string[]) => {
      calls.push({ sql, parameters });
      return Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      );
    },
  };
  return { db, reader, calls };
}

describe("set execution context", () => {
  it("loads scoped context, live deleted exercises, and positional targets without a session graph", async () => {
    const { reader, calls } = setup();
    const result = await getSetExecutionContext(reader, reference);
    expect(calls).toHaveLength(2);
    expect(result).toMatchObject({
      reference,
      session: {
        id: "s",
        programId: "p",
        name: "Selected",
        status: "Planned",
        deload: true,
        revision: 7,
      },
      activity: {
        id: "a",
        reps: 5,
        warmupSetCount: 2,
        mainSetCount: 2,
        restMinutes: 2.5,
      },
      exercise: {
        id: "e",
        deleted: true,
        loadKind: "WEIGHT_PAIR",
        oneRepMax: { value: 100, unit: "kg" },
      },
      set: { id: "warmup", kind: "Warmup", position: 3, actualReps: null },
      firstMainSet: {
        id: "main",
        position: 2,
        weightValue: 25,
        weightUnit: "lbs",
      },
      targetWeight: { value: 40, unit: "kg" },
      mainTargetWeight: { value: 80, unit: "kg" },
      hasTemplateHistory: true,
      isStartable: true,
      canComplete: false,
    });
    expect(result?.session).not.toHaveProperty("activities");
    expect(result?.exercise).not.toHaveProperty("notes");
    expect(result?.activity).not.toHaveProperty("mainSets");
    const second = await getSetExecutionContext(reader, {
      ...reference,
      setId: "warmup-2",
    });
    expect(second?.targetWeight).toEqual({ value: 60, unit: "kg" });
    expect(second?.isStartable).toBe(false);
    const repeated = await getSetExecutionContext(reader, {
      ...reference,
      activityId: "repeated",
    });
    expect(repeated?.targetWeight).toEqual({ value: 10, unit: "kg" });
    expect(repeated?.activity.reps).toBe(12);
    expect(repeated?.activity.warmupSetCount).toBe(0);
  });

  it("matches Start/Complete policy without crossing activities or reopening terminal sessions", async () => {
    const { db, reader } = setup();
    const main = { ...reference, setId: "main" };
    expect((await getSetExecutionContext(reader, main))?.isStartable).toBe(
      false,
    );
    db.exec(`UPDATE workout_sets SET status = 'Done'
      WHERE program_id = 'p' AND activity_id = 'a' AND kind = 'Warmup'`);
    expect((await getSetExecutionContext(reader, main))?.isStartable).toBe(
      true,
    );
    db.exec(`UPDATE sessions SET status = 'Ready' WHERE program_id = 'p' AND id = 's';
      UPDATE workout_sets SET status = 'Ready' WHERE program_id = 'p' AND activity_id = 'a' AND id = 'main'`);
    expect((await getSetExecutionContext(reader, main))?.canComplete).toBe(
      true,
    );
    db.exec(
      `UPDATE workout_sets SET actual_reps = 0 WHERE program_id = 'p' AND activity_id = 'a' AND id = 'main'`,
    );
    expect((await getSetExecutionContext(reader, main))?.canComplete).toBe(
      false,
    );
    for (const status of ["Done", "Incomplete"]) {
      db.prepare(
        "UPDATE sessions SET status = ? WHERE program_id = 'p' AND id = 's'",
      ).run(status);
      const terminal = await getSetExecutionContext(reader, main);
      expect(terminal?.isStartable).toBe(false);
      expect(terminal?.canComplete).toBe(false);
    }
  });

  it("preserves unavailable references and unknown targets, and distinguishes missing sets", async () => {
    const { db, reader, calls } = setup();
    db.exec(
      "UPDATE activities SET exercise_id = NULL, reps = NULL, load_type = NULL, load_value = NULL WHERE program_id = 'p' AND id = 'a'",
    );
    const recovered = await getSetExecutionContext(reader, reference);
    expect(recovered?.exercise).toBeNull();
    expect(recovered?.activity.reps).toBeNull();
    expect(recovered?.targetWeight).toBeNull();
    expect(recovered?.set.actualReps).toBeNull();
    calls.length = 0;
    expect(
      await getSetExecutionContext(reader, { ...reference, setId: "missing" }),
    ).toBeNull();
    expect(calls).toHaveLength(1);
    db.exec(
      "DELETE FROM workout_sets WHERE program_id = 'p' AND activity_id = 'a' AND kind = 'Main'",
    );
    const withoutMain = await getSetExecutionContext(reader, reference);
    expect(withoutMain?.firstMainSet).toBeNull();
    expect(withoutMain?.mainTargetWeight).toBeNull();
  });

  it("resolves lineage history by program and position, with live exercise targets", async () => {
    const { db, reader } = setup();
    expect(
      (
        await getSetExecutionContext(reader, {
          ...reference,
          programId: "other",
        })
      )?.hasTemplateHistory,
    ).toBe(false);
    db.exec(`DELETE FROM sessions WHERE program_id = 'p' AND id = 'previous';
      UPDATE exercises SET one_rep_max_value = 200, revision = revision + 1 WHERE id = 'e'`);
    const changed = await getSetExecutionContext(reader, reference);
    expect(changed?.hasTemplateHistory).toBe(false);
    expect(changed?.targetWeight).toEqual({ value: 80, unit: "kg" });
    expect(changed?.exercise?.revision).toBe(1);
  });

  it("keeps query count and indexed work scoped to the selected activity as history grows", async () => {
    const { db, reader, calls } = setup();
    const before = await getSetExecutionContext(reader, reference);
    calls.length = 0;
    db.exec(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 1000)
      INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload)
        SELECT 'p', 'history-' || x, 'lineage', 'History', x + 2, 'Done', 0 FROM n;
      INSERT INTO activities(program_id, session_id, id, exercise_id, position)
        SELECT program_id, id, 'a', 'e', 0 FROM sessions WHERE id LIKE 'history-%';
      INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback)
        SELECT program_id, session_id, id, 'set', 'Main', 0, 'Done', 'Neutral' FROM activities WHERE session_id LIKE 'history-%';`);
    expect(await getSetExecutionContext(reader, reference)).toEqual(before);
    expect(calls).toHaveLength(2);
    const plans = calls.flatMap(({ sql, parameters }) =>
      db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...parameters),
    ) as { detail: string }[];
    expect(
      plans.some(({ detail }) =>
        /SEARCH w USING INDEX.*program_id=.*session_id=.*activity_id=.*id=/.test(
          detail,
        ),
      ),
    ).toBe(true);
    expect(
      plans.some(({ detail }) =>
        /sessions_lineage.*program_id=.*lineage_id=.*position</.test(detail),
      ),
    ).toBe(true);
    expect(
      plans.some(({ detail }) =>
        /^SCAN (w|workout_sets|previous)\b/.test(detail),
      ),
    ).toBe(false);
  });
});

describe("graph-free set target parity", () => {
  it("retains the existing percentage warmup fallback, units, RPE weights, and zero-load rules", () => {
    for (const count of [0, 1, 2, 3, 4, 5, 7]) {
      for (const type of ["PERCENT", "RPE"] as const) {
        const set = (kind: WorkoutSet["type"], index: number): WorkoutSet => ({
          workoutSetId: `${kind}-${index}`,
          type: kind,
          status: "Planned",
          feedback: "Neutral",
          weight: { value: 22.5, unit: "kg" },
        });
        const activity: Activity = {
          activityId: "a",
          exerciseId: "e",
          reps: 5,
          rest: 2,
          load: { type, value: 0.775 },
          warmupSets: Array.from({ length: count }, (_, index) => ({
            ...set("Warmup", index),
            type: "Warmup",
          })),
          mainSets: [{ ...set("Main", 0), type: "Main" }],
        };
        for (const workoutSet of [
          ...activity.warmupSets,
          ...activity.mainSets,
        ]) {
          const index =
            workoutSet.type === "Warmup"
              ? activity.warmupSets.findIndex(
                  ({ workoutSetId }) =>
                    workoutSetId === workoutSet.workoutSetId,
                )
              : 0;
          for (const value of [0, 200.5, -10]) {
            const oneRepMax = { value, unit: "kg" as const };
            expect(
              plannedSetWeight(
                {
                  loadType: type,
                  loadValue: activity.load.value,
                  warmupSetCount: count,
                },
                {
                  kind: workoutSet.type,
                  index,
                  weight: workoutSet.weight ?? null,
                },
                oneRepMax,
              ),
            ).toEqual(
              plannedWeightForWorkoutSet(activity, workoutSet, oneRepMax) ??
                null,
            );
          }
        }
      }
    }
    expect(
      plannedSetWeight(
        { loadType: "PERCENT", loadValue: 0, warmupSetCount: 0 },
        { kind: "Main", index: 0, weight: null },
        { value: 200, unit: "lbs" },
      ),
    ).toBeNull();
  });
});
