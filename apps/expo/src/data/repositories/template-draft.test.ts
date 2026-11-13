import { describe, expect, it } from "vitest";

import type { SessionDetail } from "./session-detail";
import { createTemplateDraft } from "./template-draft";

describe("template draft", () => {
  it("averages completed reps, resets execution state, and retains only RPE weights", () => {
    const set = {
      id: "old",
      kind: "Main" as const,
      position: 0,
      status: "Done" as const,
      feedback: "Hard" as const,
      actualReps: 6,
      weightValue: 100,
      weightUnit: "lbs" as const,
      startMs: 1,
      endMs: 2,
    };
    const source: SessionDetail = {
      id: "s",
      programId: "p",
      name: "Template",
      lineageId: "t",
      status: "Done",
      deload: true,
      startMs: 1,
      endMs: 2,
      lastActivityAtMs: 2,
      revision: 4,
      activities: [
        {
          id: "rpe",
          exerciseId: "e",
          exerciseName: "Exercise",
          exerciseDeleted: false,
          reps: 5,
          loadType: "RPE",
          loadValue: 8,
          restMinutes: 2,
          warmupSets: [{ ...set, kind: "Warmup" }],
          mainSets: [set, { ...set, id: "second", actualReps: 9 }],
        },
        {
          id: "percentage",
          exerciseId: "e",
          exerciseName: "Exercise",
          exerciseDeleted: false,
          reps: 4,
          loadType: "PERCENT",
          loadValue: 0.8,
          restMinutes: 2,
          warmupSets: [],
          mainSets: [{ ...set, actualReps: 0 }],
        },
      ],
    };
    let id = 0;
    const draft = createTemplateDraft(source, () => `new-${++id}`);
    expect(draft).toMatchObject({
      name: "Template",
      deload: false,
      startMs: null,
      endMs: null,
    });
    expect(draft.activities[0]).toMatchObject({
      id: "new-1",
      reps: 8,
      warmupSets: [
        { id: "new-2", status: "Planned", actualReps: 0, weightValue: 100 },
      ],
      mainSets: [{ id: "new-3", feedback: "Neutral" }, { id: "new-4" }],
    });
    expect(draft.activities[1]).toMatchObject({
      id: "new-5",
      reps: 4,
      mainSets: [{ id: "new-6", weightValue: null, weightUnit: null }],
    });
  });
});
