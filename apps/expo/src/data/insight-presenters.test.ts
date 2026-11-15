import { describe, expect, it } from "vitest";

import {
  presentExerciseInsights,
  presentProgramInsights,
} from "./insight-presenters";

describe("SQLite insight presentation", () => {
  it("converts primitive timestamps only for presentation", () => {
    const projection = {
      programName: "Program",
      partial: true,
      muscleGroups: ["Chest"],
      weeks: [
        {
          week: 1,
          startMs: 0,
          endMs: 86400000,
          muscleGroups: [
            {
              muscleGroup: "Chest",
              sets: 1,
              reps: 5,
              volumeLbs: 50,
              hardSets: 0,
              easySets: 0,
              partial: true,
              pending: {
                sets: 0,
                reps: 0,
                volumeLbs: 0,
                hardSets: 0,
                easySets: 0,
              },
            },
          ],
        },
      ],
    };
    const result = presentProgramInsights(projection);
    expect(result.weeks[0]?.start).toEqual(new Date(0));
    expect(result.weeks[0]?.muscleGroups[0]).not.toHaveProperty("partial");
    expect(projection.weeks[0]?.startMs).toBe(0);
    expect(projection.weeks[0]?.muscleGroups[0]?.partial).toBe(true);
  });

  it("preserves epoch-zero dates and missing values in exercise chart data", () => {
    const projection = {
      exerciseName: "Exercise",
      sessionName: "Session",
      partial: true,
      series: [
        {
          setType: "Main" as const,
          setNumber: 1,
          selected: true,
          points: [
            {
              sessionId: "s",
              dateMs: 0,
              reps: 5,
              weightLbs: 0,
              volumeLbs: 0,
              feedback: null,
              current: true,
              completed: false,
              notStarted: false,
              partial: true,
            },
            {
              sessionId: "missing",
              dateMs: null,
              reps: 0,
              weightLbs: 0,
              volumeLbs: 0,
              feedback: null,
              current: false,
              completed: false,
              notStarted: false,
              partial: false,
            },
          ],
        },
      ],
    };
    const result = presentExerciseInsights(projection);
    expect(result[0]?.points[0]?.date).toEqual(new Date(0));
    expect(result[0]?.points[0]?.feedback).toBeUndefined();
    expect(result[0]?.points[1]?.date).toBeUndefined();
    expect(projection.series[0]?.points[0]?.dateMs).toBe(0);
  });
});
