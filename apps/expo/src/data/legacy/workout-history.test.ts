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
      start: new Date("2025-01-01T00:00:00.123Z"),
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
    expect(result.repairs.map(({ reason }) => reason)).toEqual([
      "numeric-string",
      "numeric-string",
    ]);
  });

  it("repairs duplicate sets using main-set precedence and reports missing references", () => {
    const input = [
      {
        programId: "p",
        name: "P",
        sessions: [
          {
            sessionId: "s",
            name: "S",
            status: "Done",
            activities: [
              {
                activityId: "a",
                exerciseId: "missing",
                reps: 5,
                load: { type: "RPE", value: 8 },
                rest: 2,
                mainSets: [
                  {
                    workoutSetId: "same",
                    type: "Main",
                    status: "Done",
                    feedback: "Neutral",
                  },
                ],
                warmupSets: [
                  {
                    workoutSetId: "same",
                    type: "Main",
                    status: "Done",
                    feedback: "Neutral",
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const result = convertWorkoutHistory(input, new Map());
    expect(result.sets[0]).toMatchObject({ id: "same", kind: "Main" });
    expect(result.sets[1]).toMatchObject({ kind: "Warmup" });
    expect(result.sets[1]?.id).not.toBe("same");
    expect(result.activities[0]?.exercise_id).toBeNull();
    expect(result.repairs.map(({ reason }) => reason)).toContain(
      "missing-exercise-reference",
    );
    expect(result.repairs.map(({ reason }) => reason)).toContain(
      "set-kind-mismatch",
    );
    expect(
      result.identities.find(({ reason }) => reason === "duplicate")?.pointer,
    ).toBe("/programs/0/sessions/0/activities/0/warmupSets/0");
    expect(convertWorkoutHistory(input, new Map())).toEqual(result);
  });

  it("accounts for quarantined entries and refuses ambiguous collection shapes", () => {
    const result = convertWorkoutHistory(
      [null, { programId: "p", name: "P", sessions: [] }],
      new Map(),
    );
    expect(result.programs).toHaveLength(1);
    expect(result.repairs).toMatchObject([
      { pointer: "/programs/0", reason: "quarantined-record" },
    ]);
    expect(() => convertWorkoutHistory({ not: "an array" }, new Map())).toThrow(
      "not an array",
    );
  });
});
