import { describe, expect, it } from "vitest";

import type { Activity, Session, Weight } from "@activity-log/ui/utils";

import { fallbackSetWeight } from "../../utils/workout-set-count";
import { createTestDb } from "../database/test-db";
import { getPlanningWeightHints } from "./planning-weights";

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p','P',0), ('other','Other',1);
    INSERT INTO session_lineages VALUES ('p','lineage'), ('p','unrelated'), ('other','lineage');
    INSERT INTO sessions(program_id,id,lineage_id,name,position,status,deload)
      VALUES ('p','old','lineage','Old',0,'Done',0), ('p','current','lineage','Current',1,'Ready',0),
             ('p','new','lineage','New',2,'Done',0), ('p','unrelated','unrelated','Unrelated',3,'Done',0),
             ('other','current','lineage','Other',0,'Done',0);
    INSERT INTO exercises(id,name,normalized_name,position) VALUES ('e','Exercise','exercise',0), ('f','Other','other',1);
    INSERT INTO activities(program_id,session_id,id,exercise_id,position,load_type,load_value)
      VALUES ('p','old','a','e',0,'RPE',8), ('p','old','b','e',1,'RPE',8),
             ('p','current','a','e',0,'RPE',8), ('p','current','b','e',1,'RPE',8),
             ('p','new','a','e',0,'RPE',8), ('p','new','b','e',1,'RPE',8),
             ('p','unrelated','a','e',0,'RPE',8), ('other','current','a','e',0,'RPE',8);
    INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,weight_value,weight_unit)
      VALUES ('p','old','a','m','Main',0,'Done','Neutral',10,'lbs'), ('p','old','b','m','Main',0,'Done','Neutral',20,'lbs'),
             ('p','current','a','m','Main',0,'Done','Neutral',30,'kg'), ('p','current','a','m2','Main',1,'Done','Neutral',35,'kg'),
             ('p','current','b','m','Main',0,'Planned','Neutral',NULL,NULL),
             ('p','new','a','m','Main',0,'Done','Neutral',40,'lbs'), ('p','new','b','m','Main',0,'Done','Neutral',50,'lbs'),
             ('p','new','b','w','Warmup',0,'Done','Neutral',0,'kg'),
             ('p','unrelated','a','m','Main',0,'Done','Neutral',900,'lbs'), ('other','current','a','m','Main',0,'Done','Neutral',999,'lbs');`);
  return { db, reader: db };
}

function sourceSession(
  id: string,
  weights: [Weight | undefined, Weight | undefined],
): Session {
  return {
    sessionId: id,
    name: id,
    status: "Done",
    deload: false,
    activities: weights.map(
      (weight, index): Activity => ({
        activityId: String(index),
        exerciseId: "e",
        reps: 5,
        rest: 1,
        load: { type: "RPE", value: 8 },
        warmupSets: [],
        mainSets: weight
          ? [
              {
                workoutSetId: "m",
                type: "Main",
                status: "Done",
                feedback: "Neutral",
                weight,
              },
            ]
          : [],
      }),
    ),
  };
}

describe("session editor planning weights", () => {
  it("matches existing fallback priority and keeps repeated exercise occurrences distinct", () => {
    const { db, reader } = setup();
    try {
      const draft = [
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: "e", loadType: "PERCENT" as const },
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: "f", loadType: "RPE" as const },
      ];
      const hints = getPlanningWeightHints(
        reader,
        "p",
        { kind: "session", sessionId: "current" },
        draft,
        "Main",
      );
      expect(hints).toEqual([
        { activityIndex: 0, weight: { value: 35, unit: "kg" } },
        { activityIndex: 2, weight: null },
        { activityIndex: 3, weight: null },
      ]);
      const source = [
        sourceSession("current", [{ value: 35, unit: "kg" }, undefined]),
        sourceSession("new", [
          { value: 40, unit: "lbs" },
          { value: 50, unit: "lbs" },
        ]),
        sourceSession("old", [
          { value: 10, unit: "lbs" },
          { value: 20, unit: "lbs" },
        ]),
      ];
      const legacyActivities = draft.map(
        (item, i): Activity => ({
          activityId: String(i),
          exerciseId: item.exerciseId,
          reps: 5,
          rest: 1,
          load: { type: item.loadType, value: 8 },
          warmupSets: [],
          mainSets: [],
        }),
      );
      for (const hint of hints)
        expect(hint.weight ?? undefined).toEqual(
          fallbackSetWeight(
            legacyActivities,
            hint.activityIndex,
            "Main",
            source,
          ),
        );
      const firstActivity = draft[0];
      const thirdActivity = draft[2];
      if (!firstActivity || !thirdActivity)
        throw new Error("Missing draft activities");
      const secondOccurrence = getPlanningWeightHints(
        reader,
        "p",
        { kind: "session", sessionId: "current" },
        [firstActivity, thirdActivity],
        "Main",
      );
      expect(secondOccurrence[1]?.weight).toEqual({ value: 50, unit: "lbs" });
      expect(
        getPlanningWeightHints(
          reader,
          "p",
          { kind: "template", sessionId: "current" },
          [firstActivity, thirdActivity],
          "Main",
        )[1]?.weight,
      ).toBeNull();
      expect(
        getPlanningWeightHints(
          reader,
          "p",
          { kind: "session", sessionId: "current" },
          [firstActivity, thirdActivity],
          "Warmup",
        )[1]?.weight,
      ).toEqual({ value: 0, unit: "kg" });
    } finally {
      db.raw.close();
    }
  });

  it("handles empty sources and rejects a missing source without leaking other program data", () => {
    const { db, reader } = setup();
    try {
      const draft = [
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: null, loadType: "RPE" as const },
      ];
      expect(getPlanningWeightHints(reader, "p", null, draft, "Main")).toEqual([
        { activityIndex: 0, weight: null },
      ]);
      expect(
        getPlanningWeightHints(
          reader,
          "p",
          { kind: "session", sessionId: "current" },
          [],
          "Main",
        ),
      ).toEqual([]);
      expect(() =>
        getPlanningWeightHints(
          reader,
          "p",
          { kind: "session", sessionId: "missing" },
          draft,
          "Main",
        ),
      ).toThrow("planning source");
      expect(
        getPlanningWeightHints(
          reader,
          "other",
          { kind: "session", sessionId: "current" },
          draft,
          "Main",
        ),
      ).toEqual([{ activityIndex: 0, weight: { value: 999, unit: "lbs" } }]);
    } finally {
      db.raw.close();
    }
  });

  it("plans large drafts", () => {
    const { db, reader } = setup();
    try {
      const activities = Array.from({ length: 405 }, () => ({
        exerciseId: "e",
        loadType: "RPE" as const,
      }));
      const hints = getPlanningWeightHints(
        reader,
        "p",
        { kind: "template", sessionId: "current" },
        activities,
        "Main",
      );
      expect(hints).toHaveLength(405);
      expect(hints[0]?.weight).toEqual({ value: 35, unit: "kg" });
      expect(hints[1]?.weight).toBeNull();
    } finally {
      db.raw.close();
    }
  });
});
