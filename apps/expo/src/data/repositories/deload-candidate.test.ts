import { describe, expect, it } from "vitest";

import { createTestDb } from "../database/test-db";
import { calculateDeloadCandidate } from "../domain/deload-candidate";
import { readDeloadCandidateFacts } from "./deload-candidate";

function setup() {
  return createTestDb(`
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
}

describe("deload candidate", () => {
  it("uses the previous completed non-deload lineage session and live exercise data", () => {
    const db = setup();
    try {
      const facts = readDeloadCandidateFacts(db, "p", "current");
      if (!facts) throw new Error("Missing facts");
      expect(facts.previous?.id).toBe("old");
      expect(calculateDeloadCandidate(facts)).toEqual({
        candidate: true,
        partial: false,
      });
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = 90 WHERE program_id = 'p' AND session_id = 'current'",
      );
      const changed = readDeloadCandidateFacts(db, "p", "current");
      if (!changed) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(changed)).toEqual({
        candidate: false,
        partial: false,
      });
      expect(readDeloadCandidateFacts(db, "missing", "current")).toBeNull();
    } finally {
      db.raw.close();
    }
  });

  it("counts sets without a weight as zero volume, like bodyweight work", () => {
    const db = setup();
    try {
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = NULL, weight_unit = NULL WHERE program_id = 'p' AND session_id = 'current'",
      );
      const facts = readDeloadCandidateFacts(db, "p", "current");
      if (!facts) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(facts)).toEqual({
        candidate: true,
        partial: false,
      });
      db.raw.exec(
        "UPDATE workout_sets SET weight_value = NULL, weight_unit = NULL WHERE program_id = 'p' AND session_id = 'old'",
      );
      const bodyweight = readDeloadCandidateFacts(db, "p", "current");
      if (!bodyweight) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(bodyweight)).toEqual({
        candidate: false,
        partial: false,
      });
    } finally {
      db.raw.close();
    }
  });

  it("marks unavailable measurements as unknown rather than inventing a candidate", () => {
    const db = setup();
    try {
      db.raw.exec(
        "UPDATE workout_sets SET actual_reps = NULL WHERE program_id = 'p' AND session_id = 'current'",
      );
      const facts = readDeloadCandidateFacts(db, "p", "current");
      if (!facts) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(facts)).toEqual({
        candidate: null,
        partial: true,
      });
      const first = readDeloadCandidateFacts(db, "p", "old");
      if (!first) throw new Error("Missing facts");
      expect(calculateDeloadCandidate(first)).toEqual({
        candidate: false,
        partial: false,
      });
    } finally {
      db.raw.close();
    }
  });
});
