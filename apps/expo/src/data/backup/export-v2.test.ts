import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { Db, SqlValue } from "../database/db";
import { transaction } from "../database/db";
import { CURRENT_SCHEMA } from "../database/migrations";
import { createTestDb, nodeDb } from "../database/test-db";
import { replaceDomainData } from "../lifecycle/replace";
import { readPortableDataV2 } from "./export-v2";
import {
  parsePortableBackupV2,
  serializePortableBackupV2,
} from "./portable-v2";
import { prepareVersion2Restore } from "./restore-v2";

function counting(db: Db) {
  let calls = 0;
  const reader: Db = {
    ...db,
    getAllSync: (sql, ...params) => {
      calls++;
      return db.getAllSync(sql, ...params);
    },
  };
  return { reader, calls: () => calls };
}

describe("portable backup v2 export", () => {
  it("preserves scoped IDs, order, unknown values, deleted exercises and customized presets", () => {
    const db = createTestDb(`
        INSERT INTO programs VALUES ('p2','Second',1), ('p1','First',0);
        INSERT INTO session_lineages VALUES ('p1','lineage'), ('p1','orphan'), ('p2','lineage');
        INSERT INTO sessions(program_id,id,lineage_id,name,position,status,deload,start_ms,end_ms,last_activity_at_ms)
          VALUES ('p1','same','lineage','Workout',0,'Incomplete',1,123456789,NULL,123456790),
                 ('p2','same','lineage','Other',0,'Done',0,NULL,NULL,NULL);
        INSERT INTO barbells VALUES ('1',0,20.5,'kg');
        INSERT INTO plates VALUES ('1',0,2.5,'kg',3);
        INSERT INTO exercises(id,name,normalized_name,position,load_kind,barbell_id,one_rep_max_value,one_rep_max_unit,notes,deleted)
          VALUES ('e','Deleted','deleted',0,'BARBELL','1',50,'kg','notes',1);
        INSERT INTO exercise_presets VALUES ('custom','Custom preset',0,'SINGLE_WEIGHT');
        INSERT INTO muscle_labels VALUES (1,'Chest','chest'), (2,'Back','back');
        INSERT INTO muscle_catalog VALUES (0,2), (1,1);
        INSERT INTO exercise_muscles VALUES ('e',0,1), ('e',1,2);
        INSERT INTO preset_muscles VALUES ('custom',0,2);
        INSERT INTO activities(program_id,session_id,id,exercise_id,position,reps,load_type,load_value,rest_minutes)
          VALUES ('p1','same','a','e',0,NULL,NULL,NULL,2.5), ('p1','same','missing',NULL,1,5,'RPE',8,NULL),
                 ('p2','same','a','e',0,8,'PERCENT',0.8,2);
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps,weight_value,weight_unit,start_ms,end_ms)
          VALUES ('p1','same','a','m2','Main',1,'Incomplete','Hard',NULL,NULL,NULL,NULL,NULL),
                 ('p1','same','a','m1','Main',0,'Done','Easy',5,10,'kg',123456789,123456790),
                 ('p1','same','a','w','Warmup',0,'Done','Neutral',3,5,'lbs',NULL,NULL),
                 ('p2','same','a','m1','Main',0,'Done','Neutral',8,20,'lbs',NULL,NULL);`);
    try {
      const { reader, calls } = counting(db);
      const data = readPortableDataV2(reader);
      expect(calls()).toBe(12);
      expect(data.programs.map(({ id }) => id)).toEqual(["p1", "p2"]);
      expect(data.programs[0]).toMatchObject({
        lineages: ["lineage", "orphan"],
        sessions: [
          {
            id: "same",
            deload: true,
            startMs: 123456789,
            activities: [
              {
                id: "a",
                reps: null,
                load: null,
                restMinutes: 2.5,
                mainSets: [
                  {
                    id: "m1",
                    weight: { value: 10, unit: "kg" },
                    startMs: 123456789,
                  },
                  { id: "m2", actualReps: null, weight: null },
                ],
                warmupSets: [{ id: "w" }],
              },
              { id: "missing", exerciseId: null },
            ],
          },
        ],
      });
      expect(
        data.programs[1]?.sessions[0]?.activities[0]?.mainSets[0],
      ).toMatchObject({ id: "m1", weight: { value: 20, unit: "lbs" } });
      expect(data.exercises).toEqual([
        {
          id: "e",
          name: "Deleted",
          loadKind: "BARBELL",
          barbellId: "1",
          oneRepMax: { value: 50, unit: "kg" },
          notes: "notes",
          deleted: true,
          primaryMuscles: ["Chest", "Back"],
        },
      ]);
      expect(data.presets).toEqual([
        {
          id: "custom",
          name: "Custom preset",
          loadKind: "SINGLE_WEIGHT",
          primaryMuscles: ["Back"],
        },
      ]);
      expect(data.muscleGroups).toEqual(["Back", "Chest"]);
      const json = serializePortableBackupV2(data, 200);
      expect(parsePortableBackupV2(json)).toEqual({
        format: "activity-log-tracker-backup",
        version: 5,
        createdAtMs: 200,
        data,
      });
      const prepared = prepareVersion2Restore(json);
      db.raw.exec(
        "CREATE TRIGGER reject_restore BEFORE INSERT ON workout_sets BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END",
      );
      expect(() =>
        transaction(db, () => replaceDomainData(db, prepared)),
      ).toThrow("simulated storage failure");
      db.raw.exec("DROP TRIGGER reject_restore");
      expect(readPortableDataV2(db)).toEqual(data);
      transaction(db, () => replaceDomainData(db, prepared));
      expect(readPortableDataV2(db)).toEqual(data);
    } finally {
      db.raw.close();
    }
  });

  it("reads a consistent snapshot even if another connection commits during export", () => {
    const directory = mkdtempSync(join(process.cwd(), ".sqlite-backup-v2-"));
    const path = join(directory, "test.sqlite");
    const writer = new DatabaseSync(path);
    const readerDb = new DatabaseSync(path);
    try {
      writer.exec(`PRAGMA journal_mode = WAL; ${CURRENT_SCHEMA}
        INSERT INTO programs VALUES ('p','Before',0);
        INSERT INTO sessions(program_id,id,name,position,status,deload) VALUES ('p','s','Before',0,'Planned',0);`);
      readerDb.exec("BEGIN");
      let first = true;
      const base = nodeDb(readerDb);
      const reader: Db = {
        ...base,
        getAllSync: <T>(sql: string, ...params: SqlValue[]) => {
          const rows = base.getAllSync<T>(sql, ...params);
          if (first) {
            first = false;
            writer.exec(
              "BEGIN IMMEDIATE; UPDATE programs SET name = 'After'; UPDATE sessions SET name = 'After'; COMMIT",
            );
          }
          return rows;
        },
      };
      const data = readPortableDataV2(reader);
      readerDb.exec("COMMIT");
      expect(data.programs[0]?.name).toBe("Before");
      expect(data.programs[0]?.sessions[0]?.name).toBe("Before");
      expect(writer.prepare("SELECT name FROM sessions").get()).toEqual({
        name: "After",
      });
    } finally {
      readerDb.close();
      writer.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects malformed portable backup data", () => {
    expect(() => parsePortableBackupV2('{"version":2}')).toThrow();
    expect(() => parsePortableBackupV2("invalid")).toThrow();
  });

  it("rejects duplicate or dangling identities before replacing data", () => {
    const backup = {
      format: "activity-log-tracker-backup",
      version: 2,
      createdAtMs: 123,
      data: {
        programs: [
          {
            id: "p",
            name: "P",
            lineages: [] as string[],
            sessions: [
              {
                id: "s",
                lineageId: "missing",
                name: "S",
                status: "Planned",
                deload: false,
                startMs: null,
                endMs: null,
                lastActivityAtMs: null,
                activities: [],
              },
            ],
          },
        ],
        exercises: [],
        presets: [],
        equipment: { barbells: [], plates: [] },
        muscleGroups: [],
      },
    };
    expect(() => prepareVersion2Restore(JSON.stringify(backup))).toThrow(
      "missing lineage",
    );
    backup.data.programs[0]?.sessions.splice(0);
    backup.data.programs.push({
      id: "p",
      name: "Duplicate",
      lineages: [],
      sessions: [],
    });
    expect(() => prepareVersion2Restore(JSON.stringify(backup))).toThrow(
      "duplicate program IDs",
    );
  });
});
