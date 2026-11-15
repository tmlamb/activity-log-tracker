import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  buildApplicationMemory,
  getMemoryDeloadFacts,
  readApplicationMemoryFacts,
} from "../application-memory";
import { SCHEMA_V1, SCHEMA_V2 } from "../database/schema";
import { calculateDeloadCandidate } from "../domain/deload-candidate";
import { readDeloadCandidateFacts } from "./deload-candidate";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} ${SCHEMA_V2}
    INSERT INTO programs VALUES ('p','P',0), ('other','Other',1);
    INSERT INTO session_lineages VALUES ('p','l'), ('other','l');
    INSERT INTO sessions(program_id,id,lineage_id,name,position,status,deload,start_ms)
      VALUES ('p','old','l','Old',0,'Done',0,100), ('p','deload','l','Deload',1,'Done',1,200),
             ('p','current','l','Current',2,'Done',0,300), ('other','old','l','Other',0,'Done',0,250);
    INSERT INTO exercises(id,name,normalized_name,position,load_kind) VALUES ('e','Exercise','exercise',0,'WEIGHT_PAIR');
    INSERT INTO activities(program_id,session_id,id,exercise_id,position,reps,load_type,load_value)
      VALUES ('p','old','a','e',0,10,'RPE',8), ('p','deload','a','e',0,10,'RPE',8), ('p','current','a','e',0,10,'RPE',8), ('other','old','a','e',0,10,'RPE',8);
    INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps,weight_value,weight_unit)
      VALUES ('p','old','a','m','Main',0,'Done','Neutral',10,100,'lbs'), ('p','deload','a','m','Main',0,'Done','Neutral',10,20,'lbs'),
             ('p','current','a','m','Main',0,'Done','Neutral',10,50,'lbs'), ('other','old','a','m','Main',0,'Done','Neutral',10,1,'lbs');`);
  const reader = {
    getFirstAsync: <T>(sql: string, ...params: string[]) =>
      Promise.resolve(
        (db.prepare(sql).get(...params) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...params: string[]) =>
      Promise.resolve(db.prepare(sql).all(...params) as T[]),
  };
  return { db, reader };
}

describe("deload candidate", () => {
  it("uses the previous completed non-deload lineage session and live exercise data", async () => {
    const { db, reader } = setup();
    try {
      const facts = await readDeloadCandidateFacts(reader, "p", "current");
      if (!facts) throw new Error("Missing facts");
      const memory = buildApplicationMemory(
        await readApplicationMemoryFacts(reader),
        1,
      );
      const memoryFacts = getMemoryDeloadFacts(memory, "p", "current");
      if (!memoryFacts) throw new Error("Missing memory facts");
      expect(calculateDeloadCandidate(memoryFacts)).toEqual(
        calculateDeloadCandidate(facts),
      );
      expect(facts.previous?.id).toBe("old");
      expect(calculateDeloadCandidate(facts)).toEqual({
        candidate: true,
        partial: false,
      });
      db.exec(
        "UPDATE workout_sets SET weight_value = 90 WHERE program_id = 'p' AND session_id = 'current'",
      );
      const changed = await readDeloadCandidateFacts(reader, "p", "current");
      if (!changed) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(changed)).toEqual({
        candidate: false,
        partial: false,
      });
      expect(
        await readDeloadCandidateFacts(reader, "missing", "current"),
      ).toBeNull();
    } finally {
      db.close();
    }
  });

  it("marks unavailable measurements as unknown rather than inventing a candidate", async () => {
    const { db, reader } = setup();
    try {
      db.exec(
        "UPDATE workout_sets SET weight_value = NULL, weight_unit = NULL WHERE program_id = 'p' AND session_id = 'current'",
      );
      const facts = await readDeloadCandidateFacts(reader, "p", "current");
      if (!facts) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(facts)).toEqual({
        candidate: null,
        partial: true,
      });
      const first = await readDeloadCandidateFacts(reader, "p", "old");
      if (!first) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(first)).toEqual({
        candidate: false,
        partial: false,
      });
    } finally {
      db.close();
    }
  });
});
