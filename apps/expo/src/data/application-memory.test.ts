import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  applyMemoryChange,
  buildApplicationMemory,
  getMemorySessionEditorSeed,
  getMemorySetContext,
  memoryKey,
  readApplicationMemoryFacts,
} from "./application-memory";
import { SCHEMA_V1, SCHEMA_V2 } from "./database/schema";
import { getSessionEditorSeed } from "./repositories/session-editor";

describe("application memory hydration", () => {
  it("loads data and revisions from the same SQLite snapshot during a concurrent write", async () => {
    const directory = mkdtempSync(join(process.cwd(), ".memory-snapshot-"));
    const path = join(directory, "test.sqlite");
    const writer = new DatabaseSync(path);
    const db = new DatabaseSync(path);
    try {
      writer.exec(`PRAGMA journal_mode = WAL; ${SCHEMA_V1} ${SCHEMA_V2}
        INSERT INTO programs VALUES ('p','Program',0);
        INSERT INTO sessions(program_id,id,name,position,status,deload,revision)
          VALUES ('p','s','Before',0,'Planned',0,1);`);
      db.exec("BEGIN");
      let first = true;
      const reader = {
        getAllAsync: <T>(sql: string) => {
          const result = db.prepare(sql).all() as T[];
          if (first) {
            first = false;
            writer.exec(
              "UPDATE sessions SET name = 'After', revision = 2 WHERE id = 's'",
            );
          }
          return Promise.resolve(result);
        },
      };
      const memory = buildApplicationMemory(
        await readApplicationMemoryFacts(reader),
        1,
      );
      db.exec("COMMIT");
      expect(memory.sessions.get(memoryKey("p", "s"))?.name).toBe("Before");
      expect(memory.sessionRevisions.get(memoryKey("p", "s"))).toBe(1);
      expect(
        writer.prepare("SELECT revision FROM sessions WHERE id = 's'").get(),
      ).toEqual({ revision: 2 });
    } finally {
      db.close();
      writer.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("loads the complete dataset and indexes child identities within their parent scopes", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} ${SCHEMA_V2}
        INSERT INTO programs VALUES ('p', 'First', 0), ('q', 'Second', 1);
        INSERT INTO sessions(program_id,id,name,position,status,deload,revision)
          VALUES ('p','s','First session',0,'Ready',0,3), ('q','s','Second session',0,'Planned',0,7);
        INSERT INTO exercises(id,name,normalized_name,position,deleted,revision)
          VALUES ('e','Exercise','exercise',0,0,5);
        INSERT INTO activities(program_id,session_id,id,exercise_id,position,reps,load_type,load_value,rest_minutes)
          VALUES ('p','s','a','e',0,8,'RPE',8,2), ('q','s','a',NULL,0,NULL,NULL,NULL,NULL);
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps)
          VALUES ('p','s','a','set','Main',3,'Done','Neutral',8), ('q','s','a','set','Warmup',7,'Planned','Neutral',NULL);`);
      const reader = {
        getAllAsync: <T>(sql: string, ...parameters: string[]) =>
          Promise.resolve(db.prepare(sql).all(...parameters) as T[]),
        getFirstAsync: <T>(sql: string, ...parameters: string[]) =>
          Promise.resolve(
            (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
          ),
      };
      db.exec("BEGIN");
      const facts = await readApplicationMemoryFacts(reader);
      db.exec("COMMIT");
      const memory = buildApplicationMemory(facts, 12);
      expect(memory.generation).toBe(12);
      expect(memory.data.programs.map(({ id }) => id)).toEqual(["p", "q"]);
      expect(memory.sessions.get(memoryKey("p", "s"))?.name).toBe(
        "First session",
      );
      expect(memory.sessions.get(memoryKey("q", "s"))?.name).toBe(
        "Second session",
      );
      const firstActivity = memory.activities.get(memoryKey("p", "s", "a"));
      const secondActivity = memory.activities.get(memoryKey("q", "s", "a"));
      if (!firstActivity || !secondActivity)
        throw new Error("Missing activity");
      expect(
        memory.setsByActivity.get(firstActivity)?.get("set"),
      ).toMatchObject({
        set: { actualReps: 8 },
        position: 3,
      });
      expect(
        memory.setsByActivity.get(secondActivity)?.get("set"),
      ).toMatchObject({
        set: { actualReps: null },
        position: 7,
      });
      expect(
        memory.activities.get(memoryKey("q", "s", "a"))?.exerciseId,
      ).toBeNull();
      expect(memory.sessionRevisions.get(memoryKey("p", "s"))).toBe(3);
      expect(memory.sessionRevisions.get(memoryKey("q", "s"))).toBe(7);
      expect(memory.exerciseRevisions.get("e")).toBe(5);
      expect(memory.exercises.get("e")?.name).toBe("Exercise");
      expect(memoryKey("a,b", "c")).not.toBe(memoryKey("a", "b,c"));
      expect(getMemorySessionEditorSeed(memory, "p", "s")).toEqual(
        await getSessionEditorSeed(reader, 12, "p", "s"),
      );
      expect(getMemorySessionEditorSeed(memory, "q", "s")).toEqual(
        await getSessionEditorSeed(reader, 12, "q", "s"),
      );
      expect(getMemorySessionEditorSeed(memory, "p", null)).toEqual(
        await getSessionEditorSeed(reader, 12, "p", null),
      );
      const replacement = await getSessionEditorSeed(reader, 12, "p", "s");
      if (!replacement?.session) throw new Error("Missing session");
      const replacementSet = replacement.session.activities[0]?.mainSets[0];
      if (!replacementSet) throw new Error("Missing set");
      replacementSet.position = 11;
      expect(
        applyMemoryChange(memory, {
          type: "replace-sessions",
          sessions: [replacement.session],
        }),
      ).toBe(true);
      expect(memory.setsByActivity.has(firstActivity)).toBe(false);
      const reference = {
        programId: "p",
        sessionId: "s",
        activityId: "a",
        setId: "set",
      };
      expect(getMemorySetContext(memory, reference)?.set.position).toBe(11);
      expect(
        getMemorySetContext(memory, { ...reference, programId: "q" })?.set
          .position,
      ).toBe(7);
      expect(
        applyMemoryChange(memory, {
          type: "delete-session",
          programId: "p",
          sessionId: "s",
        }),
      ).toBe(true);
      expect(getMemorySetContext(memory, reference)).toBeNull();
      expect(
        getMemorySetContext(memory, { ...reference, programId: "q" })?.set
          .position,
      ).toBe(7);
    } finally {
      db.close();
    }
  });
});
