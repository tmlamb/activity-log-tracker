import { describe, expect, it } from "vitest";

import type { Activity, Session, WorkoutSet } from "@activity-log/ui/utils";

import {
  fallbackSetWeight,
  numberToWorkoutSetArray,
} from "./workout-set-count";

describe("numberToWorkoutSetArray", () => {
  it.each(["Warmup", "Main"] as const)(
    "inherits the last %s weight when adding sets, including after reducing the count",
    (type) => {
      const original: WorkoutSet[] = [
        {
          workoutSetId: "1",
          type,
          status: "Planned",
          feedback: "Neutral",
          weight: { value: 50, unit: "kg" },
        },
        {
          workoutSetId: "2",
          type,
          status: "Planned",
          feedback: "Neutral",
          weight: { value: 60, unit: "kg" },
        },
      ];
      let id = 2;
      const createId = () => String(++id);
      const expanded = numberToWorkoutSetArray(4, original, type, createId);
      expect(expanded.map((set) => set.weight?.value)).toEqual([
        50, 60, 60, 60,
      ]);
      const reduced = numberToWorkoutSetArray(1, expanded, type, createId);
      const expandedAgain = numberToWorkoutSetArray(3, reduced, type, createId);
      expect(expandedAgain.map((set) => set.weight?.value)).toEqual([
        50, 50, 50,
      ]);
      expect(new Set(expandedAgain.map((set) => set.workoutSetId)).size).toBe(
        3,
      );
      const empty = numberToWorkoutSetArray(0, expandedAgain, type, createId);
      expect(
        numberToWorkoutSetArray(
          2,
          empty,
          type,
          createId,
          undefined,
          original[1]?.weight,
        ).map((set) => set.weight?.value),
      ).toEqual([60, 60]);
    },
  );

  it("leaves weights undefined when there is no prior weight", () => {
    expect(
      numberToWorkoutSetArray<WorkoutSet>(2, [], "Main", () => "id").map(
        (set) => set.weight,
      ),
    ).toEqual([undefined, undefined]);
  });
});

describe("fallbackSetWeight", () => {
  it("recovers weights from the matching template activity after all sets were removed", () => {
    const set: WorkoutSet = {
      workoutSetId: "set",
      type: "Main",
      status: "Done",
      feedback: "Neutral",
      weight: { value: 80, unit: "lbs" },
    };
    const activity: Activity = {
      activityId: "activity",
      exerciseId: "exercise",
      load: { type: "RPE", value: 8 },
      reps: 5,
      rest: 2,
      mainSets: [{ ...set, type: "Main" }],
      warmupSets: [
        { ...set, type: "Warmup", weight: { value: 40, unit: "lbs" } },
      ],
    };
    const source: Session = {
      sessionId: "source",
      name: "Template",
      status: "Done",
      deload: false,
      activities: [activity],
    };
    const empty = { ...activity, warmupSets: [], mainSets: [] };
    expect(fallbackSetWeight([empty], 0, "Warmup", [source])).toEqual({
      value: 40,
      unit: "lbs",
    });
    expect(fallbackSetWeight([empty], 0, "Main", [source])).toEqual({
      value: 80,
      unit: "lbs",
    });
    expect(
      fallbackSetWeight(
        [{ ...empty, load: { type: "PERCENT", value: 0.8 } }],
        0,
        "Main",
        [source],
      ),
    ).toBeUndefined();
  });
});
