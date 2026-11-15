import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { Exercise, Program } from "@activity-log/ui/utils";
import { buildProgramInsights } from "@activity-log/ui/utils";

import {
  buildApplicationMemory,
  getMemoryProgramInsightFacts,
  readApplicationMemoryFacts,
} from "../application-memory";
import { SCHEMA_V1 } from "../database/schema";
import { buildProgramInsightProjection } from "../domain/program-insights";
import { readProgramInsightFacts } from "./program-insights";

const now = new Date(2026, 0, 20, 12);
const start = new Date(2026, 0, 1, 12);

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
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
  const reader = {
    getFirstAsync: <T>(sql: string, ...parameters: string[]) => {
      calls++;
      return Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      );
    },
    getAllAsync: <T>(sql: string, ...parameters: string[]) => {
      calls++;
      return Promise.resolve(db.prepare(sql).all(...parameters) as T[]);
    },
  };
  return { db, reader, calls: () => calls };
}

describe("program insights projection", () => {
  it("derives the same analytics facts from the hydrated model", async () => {
    const { db, reader } = setup();
    try {
      const facts = await readProgramInsightFacts(reader, "p");
      const memory = buildApplicationMemory(
        await readApplicationMemoryFacts(reader),
        1,
      );
      expect(getMemoryProgramInsightFacts(memory, "p")).toEqual(facts);
      expect(getMemoryProgramInsightFacts(memory, "missing")).toBeNull();
    } finally {
      db.close();
    }
  });
  it("matches existing insights for completed, pending, paired weights, deleted references, and missing weeks", async () => {
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
      const facts = await readProgramInsightFacts(reader, "p");
      if (!facts) throw new Error("Missing program");
      expect(calls()).toBe(4);
      expect(facts.sets).toHaveLength(3);
      const actual = buildProgramInsightProjection(facts, now.getTime());
      const legacy = buildProgramInsights(program, [exercise], now);
      expect(actual.partial).toBe(false);
      expect({
        muscleGroups: actual.muscleGroups,
        weeks: actual.weeks.map(({ week, startMs, endMs, muscleGroups }) => ({
          week,
          start: new Date(startMs),
          end: new Date(endMs),
          muscleGroups: muscleGroups.map(
            ({ partial: _partial, ...metrics }) => metrics,
          ),
        })),
      }).toEqual(legacy);
      expect(await readProgramInsightFacts(reader, "missing")).toBeNull();
    } finally {
      db.close();
    }
  });

  it("marks unknown measurements and missing exercise references as partial without fabricating totals", async () => {
    const { db, reader } = setup();
    try {
      db.exec(`UPDATE workout_sets SET weight_value = NULL, weight_unit = NULL WHERE program_id = 'p' AND session_id = 'done' AND id = 'm1';
        UPDATE activities SET reps = NULL WHERE program_id = 'p' AND session_id = 'planned';
        INSERT INTO activities(program_id, session_id, id, position) VALUES ('p', 'planned', 'missing', 1);
        INSERT INTO workout_sets(program_id, session_id, activity_id, id, kind, position, status, feedback) VALUES ('p', 'planned', 'missing', 'set', 'Main', 0, 'Planned', 'Neutral');`);
      const facts = await readProgramInsightFacts(reader, "p");
      if (!facts) throw new Error("Missing program");
      const result = buildProgramInsightProjection(facts, now.getTime());
      expect(result.partial).toBe(true);
      expect(result.weeks[0]?.muscleGroups[0]).toMatchObject({
        sets: 1,
        reps: 8,
        volumeLbs: 0,
        partial: true,
      });
      expect(result.weeks[2]?.muscleGroups[0]).toMatchObject({
        pending: { sets: 1, reps: 0, volumeLbs: 0 },
        partial: true,
      });
    } finally {
      db.close();
    }
  });
});
