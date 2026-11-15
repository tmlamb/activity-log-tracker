import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { Db, SqlValue } from "../database/db";
import { SCHEMA } from "../database/schema";
import { createTestDb, nodeDb } from "../database/test-db";
import { getSessionEditorSeed } from "./session-editor";

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'Program', 0), ('other', 'Other', 1);
    INSERT INTO session_lineages VALUES ('p', 'lineage'), ('other', 'lineage');
    INSERT INTO sessions(program_id,id,lineage_id,name,position,status,deload,revision)
      VALUES ('p','earlier','lineage','Earlier',0,'Done',0,0),
             ('p','s','lineage','Selected',1,'Ready',1,4),
             ('other','s','lineage','Other',0,'Ready',0,0);
    INSERT INTO exercises(id,name,normalized_name,position,load_kind,one_rep_max_value,one_rep_max_unit,deleted)
      VALUES ('e','Deleted exercise','deletedexercise',0,'WEIGHT_PAIR',100,'kg',1),
             ('unused','Unused','unused',1,'BARBELL',NULL,NULL,0);
    INSERT INTO activities(program_id,session_id,id,exercise_id,position)
      VALUES ('p','s','first','e',0), ('p','s','repeat','e',1), ('p','s','unavailable',NULL,2),
             ('other','s','first','unused',0);
    INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback)
      VALUES ('p','s','first','m2','Main',1,'Planned','Neutral'),
             ('p','s','first','m1','Main',0,'Done','Hard'),
             ('p','s','repeat','m1','Main',0,'Ready','Easy');`);
  const calls: string[] = [];
  const reader: Db = {
    ...db,
    getFirstSync: (sql, ...parameters) => {
      calls.push(sql);
      return db.getFirstSync(sql, ...parameters);
    },
    getAllSync: (sql, ...parameters) => {
      calls.push(sql);
      return db.getAllSync(sql, ...parameters);
    },
  };
  return { db, reader, calls };
}

describe("session editor seed", () => {
  it("loads a single consistent seed with scoped activities and only referenced live exercises", () => {
    const { db, reader, calls } = setup();
    try {
      const seed = getSessionEditorSeed(reader, "p", "s");
      expect(calls).toHaveLength(6);
      expect(seed).toMatchObject({
        program: { id: "p", name: "Program" },
        session: {
          id: "s",
          revision: 4,
          deload: true,
          activities: [
            { id: "first", mainSets: [{ id: "m1" }, { id: "m2" }] },
            { id: "repeat", mainSets: [{ id: "m1" }] },
            { id: "unavailable", exerciseId: null },
          ],
        },
        policy: { canSetDeload: true, isLatestCompletedInLineage: false },
        exercises: [
          {
            id: "e",
            deleted: true,
            loadKind: "WEIGHT_PAIR",
            oneRepMax: { value: 100, unit: "kg" },
          },
        ],
      });
      expect(seed?.exercises).toHaveLength(1);
      expect(seed?.exercises[0]).not.toHaveProperty("notes");
      expect(getSessionEditorSeed(reader, "p", null)).toEqual({
        program: { id: "p", name: "Program" },
        session: null,
        policy: null,
        exercises: [],
      });
      expect(getSessionEditorSeed(reader, "p", "missing")).toBeNull();
      expect(getSessionEditorSeed(reader, "missing", null)).toBeNull();
      expect(
        getSessionEditorSeed(reader, "other", "s")?.exercises.map(
          ({ id }) => id,
        ),
      ).toEqual(["unused"]);
    } finally {
      db.raw.close();
    }
  });

  it("preserves the editor seed when unrelated history grows", () => {
    const { db, reader } = setup();
    try {
      const before = getSessionEditorSeed(reader, "p", "s");
      db.raw
        .exec(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 1000)
        INSERT INTO sessions(program_id,id,name,position,status,deload)
          SELECT 'p','history-' || x,'History',x + 2,'Done',0 FROM n;
        INSERT INTO activities(program_id,session_id,id,exercise_id,position)
          SELECT program_id,id,'a','unused',0 FROM sessions WHERE id LIKE 'history-%';
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback)
          SELECT program_id,session_id,id,'set','Main',0,'Done','Neutral' FROM activities WHERE session_id LIKE 'history-%';`);
      expect(getSessionEditorSeed(reader, "p", "s")).toEqual(before);
    } finally {
      db.raw.close();
    }
  });

  it("reads program and session from the same snapshot when another connection commits", () => {
    const directory = mkdtempSync(
      join(process.cwd(), ".sqlite-editor-snapshot-"),
    );
    const path = join(directory, "test.sqlite");
    const writer = new DatabaseSync(path);
    const readerDb = new DatabaseSync(path);
    try {
      writer.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; ${SCHEMA}
        INSERT INTO programs VALUES ('p','Before',0);
        INSERT INTO sessions(program_id,id,name,position,status,deload) VALUES ('p','s','Before',0,'Planned',0);`);
      readerDb.exec("PRAGMA foreign_keys = ON; BEGIN");
      let firstRead = true;
      const base = nodeDb(readerDb);
      const reader: Db = {
        ...base,
        getFirstSync: <T>(sql: string, ...parameters: SqlValue[]) => {
          const row = base.getFirstSync<T>(sql, ...parameters);
          if (firstRead) {
            firstRead = false;
            writer.exec(
              "BEGIN IMMEDIATE; UPDATE programs SET name = 'After'; UPDATE sessions SET name = 'After'; COMMIT;",
            );
          }
          return row;
        },
      };
      const seed = getSessionEditorSeed(reader, "p", "s");
      readerDb.exec("COMMIT");
      expect(seed?.program.name).toBe("Before");
      expect(seed?.session?.name).toBe("Before");
      expect(
        writer.prepare("SELECT name FROM sessions WHERE id = 's'").get(),
      ).toEqual({ name: "After" });
    } finally {
      readerDb.close();
      writer.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
