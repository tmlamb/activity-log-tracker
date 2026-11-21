import { describe, expect, it } from "vitest";

import type { Exercise, Program } from "@activity-log/ui/utils";
import { buildProgramInsights } from "@activity-log/ui/utils";

import type { Db } from "../database/db";
import { createTestDb } from "../database/test-db";
import { buildProgramInsightProjection } from "../domain/program-insights";
import { readProgramInsightFacts } from "./program-insights";

const now = new Date(2026, 0, 20, 12);
const start = new Date(2026, 0, 1, 12);

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);
    INSERT INTO sessions(program_id, id, name, position, status, deload, start_ms)
      VALUES ('p', 'done', 'Done', 0, 'Done', 0, ${start.getTime()}),
             ('p', 'planned', 'Planned', 1, 'Planned', 0, NULL),
             ('other', 'done', 'Other', 0, 'Done', 0, ${start.getTime()});
    INSERT INTO exercises(id, name, normalized_name, position, load_kind, one_rep_max_value, one_rep_max_unit, deleted)
      VALUES ('e', 'Exercise', 'exercise', 0, 'WEIGHT_PAIR', 100, 'kg', 1);
    INSERT INTO muscle_labels VALUES (1, 'Chest', 'chest'), (2, 'Triceps', 'triceps');
    INSERT INTO exercise_muscles VALUES ('e', 0, 1), ('e', 1, 2);
    INSERT INTO activities(program_id, session_id, id, exercise_id, position, reps, load_type, load_value)
      VALUES ('p', 'done', 'a', 'e', 0, 8, 'RPE', 8),
             ('p', 'planned', 'a', 'e', 0, 10, 'PERCENT', 0.75),
             ('other', 'done', 'a', 'e', 0, 99, 'RPE', 9);
    INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback, actual_reps, weight_value, weight_unit)
      VALUES ('p', 'done', 'a', 'm1', 'Main', 0, 'Done', 'Hard', 8, 20, 'kg'),
             ('p', 'done', 'a', 'm2', 'Main', 1, 'Incomplete', 'Easy', 4, 50, 'lbs'),
             ('p', 'planned', 'a', 'm1', 'Main', 0, 'Planned', 'Neutral', 0, NULL, NULL),
             ('p', 'planned', 'a', 'w1', 'Warmup', 0, 'Planned', 'Neutral', 0, 1, 'lbs'),
             ('other', 'done', 'a', 'm1', 'Main', 0, 'Done', 'Hard', 99, 100, 'lbs');`);
  let calls = 0;
  const reader: Db = {
    ...db,
    getFirstSync: (sql, ...params) => {
      calls++;
      return db.getFirstSync(sql, ...params);
    },
    getAllSync: (sql, ...params) => {
      calls++;
      return db.getAllSync(sql, ...params);
    },
  };
  return { db, reader, calls: () => calls };
}

describe("program insights projection", () => {
  it("matches existing insights for completed, pending, paired weights, deleted references, and missing weeks", () => {
    const { db, reader, calls } = setup();
    try {
      const exercise: Exercise = {
        exerciseId: "e",
        name: "Exercise",
        loadKind: "WEIGHT_PAIR",
        oneRepMax: { value: 100, unit: "kg" },
        primaryMuscles: ["Chest", "Triceps"],
        deleted: true,
      };
      const program: Program = {
        programId: "p",
        name: "Program",
        sessions: [
          {
            sessionId: "done",
            name: "Done",
            status: "Done",
            deload: false,
            start,
            activities: [
              {
                activityId: "a",
                exerciseId: "e",
                reps: 8,
                rest: 0,
                load: { type: "RPE", value: 8 },
                warmupSets: [],
                mainSets: [
                  {
                    workoutSetId: "m1",
                    type: "Main",
                    status: "Done",
                    feedback: "Hard",
                    actualReps: 8,
                    weight: { value: 20, unit: "kg" },
                  },
                  {
                    workoutSetId: "m2",
                    type: "Main",
                    status: "Incomplete",
                    feedback: "Easy",
                    actualReps: 4,
                    weight: { value: 50, unit: "lbs" },
                  },
                ],
              },
            ],
          },
          {
            sessionId: "planned",
            name: "Planned",
            status: "Planned",
            deload: false,
            activities: [
              {
                activityId: "a",
                exerciseId: "e",
                reps: 10,
                rest: 0,
                load: { type: "PERCENT", value: 0.75 },
                warmupSets: [],
                mainSets: [
                  {
                    workoutSetId: "m1",
                    type: "Main",
                    status: "Planned",
                    feedback: "Neutral",
                    actualReps: 0,
                  },
                ],
              },
            ],
          },
        ],
      };
      const facts = readProgramInsightFacts(reader, "p");
      if (!facts) throw new Error("Missing program");
      expect(calls()).toBe(6);
      expect(facts.completed).toHaveLength(1);
      expect(facts.sets).toHaveLength(2);
      const actual = buildProgramInsightProjection(facts, now.getTime());
      const legacy = buildProgramInsights(program, [exercise], now);
      expect(actual.partial).toBe(false);
      expect({
        muscleGroups: actual.muscleGroups,
        weeks: actual.weeks.map(({ week, startMs, endMs, muscleGroups }) => ({
          week,
          start: new Date(startMs),
          end: new Date(endMs),
          // Legacy insights have no drop sets to count separately.
          muscleGroups: muscleGroups.map(
            ({
              partial: _partial,
              drop: _drop,
              dropPending: _dropPending,
              ...metrics
            }) => metrics,
          ),
        })),
      }).toEqual(legacy);
      expect(readProgramInsightFacts(reader, "missing")).toBeNull();
    } finally {
      db.raw.close();
    }
  });

  it("marks unknown measurements and missing exercise references as partial without fabricating totals, but counts no weight as zero volume", () => {
    const { db, reader } = setup();
    try {
      db.raw
        .exec(`UPDATE workout_sets SET weight_value = NULL, weight_unit = NULL WHERE program_id = 'p' AND session_id = 'done' AND id = 'm1';
        UPDATE activities SET reps = NULL WHERE program_id = 'p' AND session_id = 'planned';
        INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 'planned', 'missing', 1);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback) VALUES ('p', 'planned', 'missing', 'set', 'Main', 0, 'Planned', 'Neutral');`);
      const facts = readProgramInsightFacts(reader, "p");
      if (!facts) throw new Error("Missing program");
      const result = buildProgramInsightProjection(facts, now.getTime());
      expect(result.partial).toBe(true);
      expect(result.weeks[0]?.muscleGroups[0]).toMatchObject({
        sets: 1,
        reps: 8,
        volumeLbs: 0,
        partial: false,
      });
      expect(result.weeks[2]?.muscleGroups[0]).toMatchObject({
        pending: { sets: 1, reps: 0, volumeLbs: 0 },
        partial: true,
      });
    } finally {
      db.raw.close();
    }
  });
});
