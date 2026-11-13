import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { SCHEMA_V1 } from "../database/schema";
import { listTemplateChoices, resolveTemplateChoice } from "./templates";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(sql: string, ...parameters: string[]) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string, ...parameters: string[]) =>
      Promise.resolve(db.prepare(sql).all(...parameters) as T[]),
  };
}

describe("template queries", () => {
  it("selects latest terminal choices, resumes existing plans, and otherwise skips deloads", async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1}
        INSERT INTO programs VALUES ('p', 'Program', 0);
        INSERT INTO session_lineages VALUES ('p', 'lineage');
        INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, start_ms, end_ms)
          VALUES ('p', 'old', 'lineage', 'Old', 0, 'Done', 0, 100, 200),
                 ('p', 'new', 'lineage', 'New', 1, 'Incomplete', 0, 300, 400),
                 ('p', 'deload', 'lineage', 'Deload', 2, 'Done', 1, 500, 600),
                 ('p', 'standalone', NULL, 'Standalone', 3, 'Done', 0, 200, 300),
                 ('p', 'planned', 'lineage', 'Planned', 4, 'Planned', 0, NULL, NULL);
        BEGIN`);
      expect(
        (await listTemplateChoices(adapter(db), "p")).map(
          ({ sessionId }) => sessionId,
        ),
      ).toEqual(["standalone", "deload"]);
      expect(await resolveTemplateChoice(adapter(db), "p", "deload")).toEqual({
        kind: "planned",
        sessionId: "planned",
      });
      db.exec("DELETE FROM sessions WHERE id = 'planned'");
      expect(await resolveTemplateChoice(adapter(db), "p", "deload")).toEqual({
        kind: "template",
        sessionId: "new",
      });
      expect(
        await resolveTemplateChoice(adapter(db), "p", "standalone"),
      ).toEqual({ kind: "template", sessionId: "standalone" });
      expect(
        await resolveTemplateChoice(adapter(db), "p", "missing"),
      ).toBeNull();
      db.exec("ROLLBACK");
    } finally {
      db.close();
    }
  });
});
