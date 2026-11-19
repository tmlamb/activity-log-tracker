import { describe, expect, it } from "vitest";

import type {
  Activity,
  Exercise,
  Program,
  Session,
  WorkoutSet,
} from "@activity-log/ui/utils";
import { buildExerciseInsights } from "@activity-log/ui/utils";

import type { Db } from "../database/db";
import { createTestDb } from "../database/test-db";
import { buildExerciseSeriesProjection } from "../domain/exercise-series";
import { readExerciseSeriesFacts } from "./exercise-series";

const start = new Date(2026, 0, 1, 12);
const current = new Date(2026, 0, 22, 12);
const reference = {
  programId: "p",
  sessionId: "current",
  activityId: "second",
  setId: "m2",
};

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);
    INSERT INTO session_lineages VALUES ('p', 'lineage'), ('other', 'lineage');
    INSERT INTO sessions(program_id,id,lineage_id,name,position,status,deload,start_ms)
      VALUES ('p','old','lineage','Old',0,'Done',0,${start.getTime()}),
             ('p','current','lineage','Current',1,'Ready',0,${current.getTime()}),
             ('other','current','lineage','Other',0,'Done',0,${current.getTime()});
    INSERT INTO exercises(id,name,normalized_name,position,load_kind,one_rep_max_value,one_rep_max_unit,deleted)
      VALUES ('e','Exercise','exercise',0,'WEIGHT_PAIR',100,'kg',1);
    INSERT INTO activities(program_id,session_id,id,exercise_id,position,reps,load_type,load_value)
      VALUES ('p','old','first','e',0,8,'RPE',8), ('p','old','second','e',1,5,'RPE',8),
             ('p','current','first','e',0,8,'RPE',8), ('p','current','second','e',1,10,'PERCENT',0.75),
             ('other','current','second','e',0,99,'RPE',8);
    INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps,weight_value,weight_unit)
      VALUES ('p','old','first','m1','Main',0,'Done','Hard',99,99,'lbs'),
             ('p','old','second','w1','Warmup',0,'Done','Easy',5,10,'kg'),
             ('p','old','second','m1','Main',0,'Done','Hard',5,20,'kg'),
             ('p','current','first','m1','Main',0,'Planned','Neutral',0,NULL,NULL),
             ('p','current','second','w1','Warmup',0,'Done','Easy',10,50,'lbs'),
             ('p','current','second','m1','Main',0,'Ready','Neutral',8,60,'kg'),
             ('p','current','second','m2','Main',1,'Planned','Neutral',0,NULL,NULL),
             ('other','current','second','m2','Main',0,'Done','Hard',99,100,'lbs');`);
  let queries = 0;
  const reader: Db = {
    ...db,
    getFirstSync: (sql, ...params) => {
      queries++;
      return db.getFirstSync(sql, ...params);
    },
    getAllSync: (sql, ...params) => {
      queries++;
      return db.getAllSync(sql, ...params);
    },
  };
  return { db, reader, queries: () => queries };
}

const set = (
  id: string,
  kind: "Main" | "Warmup",
  status: WorkoutSet["status"],
  reps: number,
  weight: WorkoutSet["weight"],
  feedback: WorkoutSet["feedback"],
): WorkoutSet => ({
  workoutSetId: id,
  type: kind,
  status,
  actualReps: reps,
  weight,
  feedback,
});
const activity = (
  id: string,
  reps: number,
  type: "PERCENT" | "RPE",
  warmupSets: Activity["warmupSets"],
  mainSets: Activity["mainSets"],
): Activity => ({
  activityId: id,
  exerciseId: "e",
  reps,
  load: { type, value: type === "PERCENT" ? 0.75 : 8 },
  rest: 1,
  warmupSets,
  mainSets,
});

describe("exercise-series projection", () => {
  it("matches existing analytics for repeated occurrences, set positions, missing sets and calendar gaps", () => {
    const { db, reader, queries } = setup();
    try {
      const old: Session = {
        sessionId: "old",
        name: "Old",
        templateId: "lineage",
        status: "Done",
        deload: false,
        start,
        activities: [
          activity(
            "first",
            8,
            "RPE",
            [],
            [
              {
                ...set(
                  "m1",
                  "Main",
                  "Done",
                  99,
                  { value: 99, unit: "lbs" },
                  "Hard",
                ),
                type: "Main",
              },
            ],
          ),
          activity(
            "second",
            5,
            "RPE",
            [
              {
                ...set(
                  "w1",
                  "Warmup",
                  "Done",
                  5,
                  { value: 10, unit: "kg" },
                  "Easy",
                ),
                type: "Warmup",
              },
            ],
            [
              {
                ...set(
                  "m1",
                  "Main",
                  "Done",
                  5,
                  { value: 20, unit: "kg" },
                  "Hard",
                ),
                type: "Main",
              },
            ],
          ),
        ],
      };
      const selectedActivity = activity(
        "second",
        10,
        "PERCENT",
        [
          {
            ...set(
              "w1",
              "Warmup",
              "Done",
              10,
              { value: 50, unit: "lbs" },
              "Easy",
            ),
            type: "Warmup",
          },
        ],
        [
          {
            ...set(
              "m1",
              "Main",
              "Ready",
              8,
              { value: 60, unit: "kg" },
              "Neutral",
            ),
            type: "Main",
          },
          {
            ...set("m2", "Main", "Planned", 0, undefined, "Neutral"),
            type: "Main",
          },
        ],
      );
      const currentSession: Session = {
        sessionId: "current",
        name: "Current",
        templateId: "lineage",
        status: "Ready",
        deload: false,
        start: current,
        activities: [
          activity(
            "first",
            8,
            "RPE",
            [],
            [
              {
                ...set("m1", "Main", "Planned", 0, undefined, "Neutral"),
                type: "Main",
              },
            ],
          ),
          selectedActivity,
        ],
      };
      const program: Program = {
        programId: "p",
        name: "Program",
        sessions: [old, currentSession],
      };
      const exercise: Exercise = {
        exerciseId: "e",
        name: "Exercise",
        loadKind: "WEIGHT_PAIR",
        oneRepMax: { value: 100, unit: "kg" },
        deleted: true,
      };
      const selectedSet = selectedActivity.mainSets[1];
      if (!selectedSet) throw new Error("Missing set");
      const facts = readExerciseSeriesFacts(reader, reference);
      if (!facts) throw new Error("Missing facts");
      // Selection, sessions, sets and alternatives.
      expect(queries()).toBe(4);
      expect(facts.selection.occurrence).toBe(1);
      expect(facts.sets).toHaveLength(5);
      const result = buildExerciseSeriesProjection(facts, current.getTime());
      const expected = buildExerciseInsights(
        program,
        currentSession,
        selectedActivity,
        selectedSet,
        exercise,
        current,
      );
      expect(result.partial).toBe(false);
      expect(
        result.series.map(({ setType, setNumber, selected, points }) => ({
          setType,
          setNumber,
          selected,
          points: points.map(
            ({ dateMs, feedback, partial: _partial, ...point }) => ({
              ...point,
              date: dateMs === null ? undefined : new Date(dateMs),
              feedback: feedback ?? undefined,
            }),
          ),
        })),
      ).toEqual(expected);
      expect(result.series[2]?.points.at(-1)).toMatchObject({
        current: true,
        notStarted: true,
        reps: 10,
        weightLbs: 75 * 2.2046226218,
      });
    } finally {
      db.raw.close();
    }
  });

  it("returns no data for unavailable selection and marks unknown recorded values partial", () => {
    const { db, reader } = setup();
    try {
      expect(
        readExerciseSeriesFacts(reader, {
          ...reference,
          setId: "missing",
        }),
      ).toBeNull();
      expect(
        readExerciseSeriesFacts(reader, {
          ...reference,
          programId: "missing",
        }),
      ).toBeNull();
      db.raw.exec(
        "UPDATE workout_sets SET actual_reps = NULL, weight_value = NULL, weight_unit = NULL WHERE program_id = 'p' AND session_id = 'old' AND activity_id = 'second' AND id = 'm1'",
      );
      const facts = readExerciseSeriesFacts(reader, reference);
      if (!facts) throw new Error("Missing facts");
      const result = buildExerciseSeriesProjection(facts, current.getTime());
      expect(result.partial).toBe(true);
      expect(result.series[1]?.points[0]).toMatchObject({
        reps: 0,
        weightLbs: 0,
        partial: true,
      });
      db.raw.exec(
        "UPDATE activities SET exercise_id = NULL WHERE program_id = 'p' AND session_id = 'current' AND id = 'second'",
      );
      expect(readExerciseSeriesFacts(reader, reference)).toBeNull();
    } finally {
      db.raw.close();
    }
  });

  it("keeps exercise-series results independent of unrelated workout histories", () => {
    const { db, reader } = setup();
    try {
      const before = readExerciseSeriesFacts(reader, reference);
      db.raw.exec(`INSERT INTO session_lineages VALUES ('p', 'unrelated');
        WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 1000)
        INSERT INTO sessions(program_id,id,lineage_id,name,position,status,deload)
          SELECT 'p', 'unrelated-' || x, 'unrelated', 'Unrelated', x + 2, 'Done', 0 FROM n;
        INSERT INTO activities(program_id,session_id,id,exercise_id,position)
          SELECT program_id,id,'a','e',0 FROM sessions WHERE lineage_id = 'unrelated';
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback)
          SELECT program_id,session_id,id,'m','Main',0,'Done','Neutral' FROM activities WHERE session_id LIKE 'unrelated-%';`);
      expect(readExerciseSeriesFacts(reader, reference)).toEqual(before);
    } finally {
      db.raw.close();
    }
  });
});
