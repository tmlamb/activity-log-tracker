import { describe, expect, it } from "vitest";

import { createTestDb } from "../database/test-db";
import { listTemplateChoices, resolveTemplateChoice } from "./templates";

describe("template queries", () => {
  it("selects latest terminal choices, resumes existing plans, and otherwise skips deloads", () => {
    const db = createTestDb(`
      INSERT INTO programs VALUES ('p', 'Program', 0);
      INSERT INTO session_lineages VALUES ('p', 'lineage');
      INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, start_ms, end_ms)
        VALUES ('p', 'old', 'lineage', 'Old', 0, 'Done', 0, 100, 200),
               ('p', 'new', 'lineage', 'New', 1, 'Incomplete', 0, 300, 400),
               ('p', 'deload', 'lineage', 'Deload', 2, 'Done', 1, 500, 600),
               ('p', 'standalone', NULL, 'Standalone', 3, 'Done', 0, 200, 300),
               ('p', 'planned', 'lineage', 'Planned', 4, 'Planned', 0, NULL, NULL);`);
    try {
      expect(
        listTemplateChoices(db, "p").map(({ sessionId }) => sessionId),
      ).toEqual(["standalone", "deload"]);
      expect(resolveTemplateChoice(db, "p", "deload")).toEqual({
        kind: "planned",
        sessionId: "planned",
      });
      // A lineage with a planned session sorts after more recent ones.
      db.raw.exec("UPDATE sessions SET start_ms = 900 WHERE id = 'standalone'");
      expect(
        listTemplateChoices(db, "p").map(({ sessionId }) => sessionId),
      ).toEqual(["standalone", "deload"]);
      db.raw.exec("DELETE FROM sessions WHERE id = 'planned'");
      expect(
        listTemplateChoices(db, "p").map(({ sessionId }) => sessionId),
      ).toEqual(["deload", "standalone"]);
      expect(resolveTemplateChoice(db, "p", "deload")).toEqual({
        kind: "template",
        sessionId: "new",
      });
      expect(resolveTemplateChoice(db, "p", "standalone")).toEqual({
        kind: "template",
        sessionId: "standalone",
      });
      expect(resolveTemplateChoice(db, "p", "missing")).toBeNull();
      expect(
        listTemplateChoices(db, "p").map(({ inProgress }) => inProgress),
      ).toEqual([false, false]);
      db.raw
        .exec(`INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, start_ms)
        VALUES ('p', 'active', 'lineage', 'Active', 5, 'Ready', 0, 700)`);
      expect(
        listTemplateChoices(db, "p").map(({ sessionId, inProgress }) => ({
          sessionId,
          inProgress,
        })),
      ).toEqual([
        { sessionId: "standalone", inProgress: false },
        { sessionId: "deload", inProgress: true },
      ]);
    } finally {
      db.raw.close();
    }
  });
});
