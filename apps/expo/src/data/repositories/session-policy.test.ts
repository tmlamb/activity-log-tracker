import { describe, expect, it } from "vitest";

import type { Session } from "@activity-log/ui/utils";
import {
  canSetSessionDeload,
  isLatestCompletedSessionInTemplateSeries,
} from "@activity-log/ui/utils";

import type { Db, SqlValue } from "../database/db";
import { createTestDb } from "../database/test-db";
import { getSessionPolicy } from "./session-policy";

function setup() {
  const db = createTestDb(`
    INSERT INTO programs VALUES ('p', 'P', 0), ('other', 'Other', 1);
    INSERT INTO session_lineages VALUES ('p', 'lineage'), ('p', 'another'), ('other', 'lineage');`);
  const calls: { sql: string; parameters: SqlValue[] }[] = [];
  const reader: Db = {
    ...db,
    getFirstSync: (sql, ...parameters) => {
      calls.push({ sql, parameters });
      return db.getFirstSync(sql, ...parameters);
    },
  };
  const insert = (
    id: string,
    position: number,
    status: Session["status"],
    lineage: string | null,
    startMs: number | null,
    endMs: number | null,
    program = "p",
  ): Session => {
    db.raw
      .prepare(
        `INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, start_ms, end_ms)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(program, id, lineage, id, position, status, startMs, endMs);
    return {
      sessionId: id,
      name: id,
      templateId: lineage ?? undefined,
      status,
      deload: false,
      start: startMs === null ? undefined : new Date(startMs),
      end: endMs === null ? undefined : new Date(endMs),
      activities: [],
    };
  };
  return { db, reader, calls, insert };
}

describe("session lineage policy projection", () => {
  it("matches existing policy for ordering, missing timestamps, ties and statuses", () => {
    const { db, reader, insert } = setup();
    try {
      const sessions = [
        insert("first", 0, "Done", "lineage", null, null),
        insert("prior-incomplete", 1, "Incomplete", "lineage", 500, 600),
        insert("out-of-order", 2, "Done", "lineage", 200, 900),
        insert("later", 3, "Done", "lineage", null, 400),
        insert("tie", 4, "Done", "lineage", 400, 900),
        insert("ready", 5, "Ready", "lineage", 900, null),
        insert("standalone", 6, "Done", null, 1000, null),
        insert("other-lineage", 7, "Done", "another", 2000, null),
      ];
      insert("tie", 0, "Done", "lineage", 9999, null, "other");
      for (const session of sessions) {
        expect(
          getSessionPolicy(reader, "p", session.sessionId),
          session.sessionId,
        ).toEqual({
          canSetDeload: canSetSessionDeload(sessions, session),
          isLatestCompletedInLineage: isLatestCompletedSessionInTemplateSeries(
            sessions,
            session,
          ),
        });
      }
      expect(getSessionPolicy(reader, "p", "missing")).toBeNull();
      expect(getSessionPolicy(reader, "other", "tie")).toEqual({
        canSetDeload: false,
        isLatestCompletedInLineage: true,
      });
    } finally {
      db.raw.close();
    }
  });

  it("finds the latest completed session in a long lineage", () => {
    const { db, reader, insert } = setup();
    try {
      insert("current", 0, "Done", "lineage", 100, 200);
      db.raw
        .exec(`WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 1000)
        INSERT INTO sessions(program_id, id, lineage_id, name, position, status, deload, start_ms)
        SELECT 'p', 'history-' || x, 'lineage', 'History', x, 'Done', 0, x + 100 FROM n;`);
      expect(getSessionPolicy(reader, "p", "current")).toEqual({
        canSetDeload: false,
        isLatestCompletedInLineage: false,
      });
    } finally {
      db.raw.close();
    }
  });
});
