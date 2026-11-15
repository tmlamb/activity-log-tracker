import { describe, expect, it } from "vitest";

import { convertWorkoutHistory } from "./workout-history";

describe("workout history conversion", () => {
  it("preserves hierarchy, ordering, lineage and repeated exercise occurrences", () => {
    const set = (id: string, type: string) => ({
      workoutSetId: id,
      type,
      status: "Done",
      feedback: "Hard",
      actualReps: 5,
      start: "2025-01-01T00:00:00.123Z",
      weight: { value: 45, unit: "lbs" },
    });
    const input = [
      {
        programId: "p",
        name: "Program",
        sessions: [
          {
            sessionId: "s",
            templateId: "lineage",
            name: "Session",
            status: "Done",
            deload: true,
            activities: [0, 1].map((i) => ({
              activityId: `a${i}`,
              exerciseId: "old-exercise",
              reps: 5,
              load: { type: "RPE", value: "8" },
              rest: 2,
              warmupSets: [set(`w${i}`, "Warmup")],
              mainSets: [set(`m${i}`, "Main")],
            })),
          },
        ],
      },
    ];
    const result = convertWorkoutHistory(
      input,
      new Map([["old-exercise", "new-exercise"]]),
    );
    expect(result.programs).toEqual([
      { id: "p", name: "Program", position: 0 },
    ]);
    expect(result.lineages).toEqual([{ program_id: "p", id: "lineage" }]);
    expect(result.sessions[0]).toMatchObject({
      id: "s",
      lineage_id: "lineage",
      deload: 1,
      start_ms: null,
    });
    expect(
      result.activities.map(({ id, exercise_id, position, load_value }) => ({
        id,
        exercise_id,
        position,
        load_value,
      })),
    ).toEqual([
      { id: "a0", exercise_id: "new-exercise", position: 0, load_value: 8 },
      { id: "a1", exercise_id: "new-exercise", position: 1, load_value: 8 },
    ]);
    expect(
      result.sets.map(({ id, kind, position, start_ms }) => ({
        id,
        kind,
        position,
        start_ms,
      })),
    ).toEqual([
      { id: "m0", kind: "Main", position: 0, start_ms: 1735689600123 },
      { id: "w0", kind: "Warmup", position: 0, start_ms: 1735689600123 },
      { id: "m1", kind: "Main", position: 0, start_ms: 1735689600123 },
      { id: "w1", kind: "Warmup", position: 0, start_ms: 1735689600123 },
    ]);
  });

  it("repairs duplicate sets using main-set precedence and falls back on unreadable values", () => {
    const result = convertWorkoutHistory(
      [
        {
          programId: "p",
          name: "P",
          sessions: [
            {
              sessionId: "s",
              name: "S",
              status: "Bogus",
              start: "not a date",
              activities: [
                {
                  activityId: "a",
                  exerciseId: "missing",
                  reps: "x",
                  load: { type: "KG", value: 8 },
                  rest: 2,
                  mainSets: [{ workoutSetId: "same", status: "Done" }],
                  warmupSets: [
                    { workoutSetId: "same", feedback: "?", weight: {} },
                  ],
                },
              ],
            },
          ],
        },
      ],
      new Map(),
    );
    expect(result.sessions[0]).toMatchObject({
      status: "Incomplete",
      start_ms: null,
    });
    expect(result.activities[0]).toMatchObject({
      exercise_id: null,
      reps: null,
      load_type: null,
      load_value: null,
    });
    expect(result.sets[0]).toMatchObject({ id: "same", kind: "Main" });
    expect(result.sets[1]).toMatchObject({
      kind: "Warmup",
      status: "Incomplete",
      feedback: "Neutral",
      weight_value: null,
      weight_unit: null,
    });
    expect(result.sets[1]?.id).not.toBe("same");
  });

  it("skips entries that are not records", () => {
    const result = convertWorkoutHistory(
      [null, { programId: "p", name: "P", sessions: [] }],
      new Map(),
    );
    expect(result.programs).toEqual([{ id: "p", name: "P", position: 0 }]);
    expect(convertWorkoutHistory(undefined, new Map()).programs).toEqual([]);
  });
});
