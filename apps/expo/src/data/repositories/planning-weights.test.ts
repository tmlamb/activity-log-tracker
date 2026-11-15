import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { Activity, Session, Weight } from "@activity-log/ui/utils";

import { fallbackSetWeight } from "../../utils/workout-set-count";
import {
  buildApplicationMemory,
  getMemoryPlanningWeightHints,
  readApplicationMemoryFacts,
} from "../application-memory";
import { SCHEMA_V1 } from "../database/schema";
import { getPlanningWeightHints } from "./planning-weights";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
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
  const calls: { sql: string; params: (string | number | null)[] }[] = [];
  const reader = {
    getFirstAsync: <T>(sql: string, ...params: (string | number | null)[]) => {
      calls.push({ sql, params });
      return Promise.resolve(
        (db.prepare(sql).get(...params) as T | undefined) ?? null,
      );
    },
    getAllAsync: <T>(sql: string, ...params: (string | number | null)[]) => {
      calls.push({ sql, params });
      return Promise.resolve(db.prepare(sql).all(...params) as T[]);
    },
  };
  return { db, reader, calls };
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
  it("derives the same hints from hydrated sessions", async () => {
    const { db, reader } = setup();
    try {
      const memory = buildApplicationMemory(
        await readApplicationMemoryFacts(reader),
        1,
      );
      const activities = [
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: "f", loadType: "RPE" as const },
      ];
      for (const source of [
        { kind: "session" as const, sessionId: "current" },
        { kind: "template" as const, sessionId: "new" },
        null,
      ])
        for (const kind of ["Warmup", "Main"] as const)
          expect(
            getMemoryPlanningWeightHints(memory, "p", source, activities, kind),
          ).toEqual(
            await getPlanningWeightHints(reader, "p", source, activities, kind),
          );
    } finally {
      db.close();
    }
  });
  it("matches existing fallback priority and keeps repeated exercise occurrences distinct", async () => {
    const { db, reader, calls } = setup();
    try {
      const draft = [
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: "e", loadType: "PERCENT" as const },
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: "f", loadType: "RPE" as const },
      ];
      const hints = await getPlanningWeightHints(
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
      expect(calls).toHaveLength(2);
      const query = calls[1];
      if (!query) throw new Error("Missing batched planning query");
      const plan = db
        .prepare(`EXPLAIN QUERY PLAN ${query.sql}`)
        .all(...query.params) as { detail: string }[];
      expect(
        plan.some(({ detail }) => detail.includes("sessions_lineage")),
      ).toBe(true);
      expect(
        plan.some(({ detail }) => detail.includes("activities_occurrence")),
      ).toBe(true);
      const setLookups = plan.filter(({ detail }) =>
        detail.startsWith("SEARCH w USING"),
      );
      expect(setLookups).toHaveLength(2);
      expect(
        setLookups.every(
          ({ detail }) =>
            detail.includes("session_id=?") && detail.includes("activity_id=?"),
        ),
      ).toBe(true);
      const firstActivity = draft[0];
      const thirdActivity = draft[2];
      if (!firstActivity || !thirdActivity)
        throw new Error("Missing draft activities");
      const secondOccurrence = await getPlanningWeightHints(
        reader,
        "p",
        { kind: "session", sessionId: "current" },
        [firstActivity, thirdActivity],
        "Main",
      );
      expect(secondOccurrence[1]?.weight).toEqual({ value: 50, unit: "lbs" });
      expect(
        (
          await getPlanningWeightHints(
            reader,
            "p",
            { kind: "template", sessionId: "current" },
            [firstActivity, thirdActivity],
            "Main",
          )
        )[1]?.weight,
      ).toBeNull();
      expect(
        (
          await getPlanningWeightHints(
            reader,
            "p",
            { kind: "session", sessionId: "current" },
            [firstActivity, thirdActivity],
            "Warmup",
          )
        )[1]?.weight,
      ).toEqual({ value: 0, unit: "kg" });
    } finally {
      db.close();
    }
  });

  it("handles empty sources and rejects a missing source without leaking other program data", async () => {
    const { db, reader } = setup();
    try {
      const draft = [
        { exerciseId: "e", loadType: "RPE" as const },
        { exerciseId: null, loadType: "RPE" as const },
      ];
      expect(
        await getPlanningWeightHints(reader, "p", null, draft, "Main"),
      ).toEqual([{ activityIndex: 0, weight: null }]);
      expect(
        await getPlanningWeightHints(
          reader,
          "p",
          { kind: "session", sessionId: "current" },
          [],
          "Main",
        ),
      ).toEqual([]);
      await expect(
        getPlanningWeightHints(
          reader,
          "p",
          { kind: "session", sessionId: "missing" },
          draft,
          "Main",
        ),
      ).rejects.toThrow("planning source");
      expect(
        await getPlanningWeightHints(
          reader,
          "other",
          { kind: "session", sessionId: "current" },
          draft,
          "Main",
        ),
      ).toEqual([{ activityIndex: 0, weight: { value: 999, unit: "lbs" } }]);
    } finally {
      db.close();
    }
  });

  it("batches large drafts rather than issuing a query for every activity", async () => {
    const { db, reader, calls } = setup();
    try {
      const activities = Array.from({ length: 405 }, () => ({
        exerciseId: "e",
        loadType: "RPE" as const,
      }));
      const hints = await getPlanningWeightHints(
        reader,
        "p",
        { kind: "template", sessionId: "current" },
        activities,
        "Main",
      );
      expect(hints).toHaveLength(405);
      expect(hints[0]?.weight).toEqual({ value: 35, unit: "kg" });
      expect(hints[1]?.weight).toBeNull();
      expect(calls).toHaveLength(4);
    } finally {
      db.close();
    }
  });
});
