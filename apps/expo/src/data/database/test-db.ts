import { DatabaseSync } from "node:sqlite";

import type { Db, SqlValue } from "./db";
import { CURRENT_SCHEMA } from "./migrations";

/** Adapt a `node:sqlite` database to the app's `Db` interface for tests. */
export function nodeDb(db: DatabaseSync): Db & { raw: DatabaseSync } {
  return {
    raw: db,
    getAllSync: <T>(sql: string, ...parameters: SqlValue[]) =>
      db.prepare(sql).all(...parameters) as T[],
    getFirstSync: <T>(sql: string, ...parameters: SqlValue[]) =>
      (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
    runSync: (sql: string, ...parameters: SqlValue[]) => ({
      changes: Number(db.prepare(sql).run(...parameters).changes),
    }),
    execSync: (sql: string) => db.exec(sql),
    prepareSync: (sql: string) => {
      const statement = db.prepare(sql);
      return {
        executeSync: (...parameters: SqlValue[]) =>
          statement.run(...parameters),
        finalizeSync: () => undefined,
      };
    },
  };
}

/** An in-memory database with the app schema and optional seed SQL. */
export function createTestDb(seed = "") {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON; ${CURRENT_SCHEMA} ${seed}`);
  return nodeDb(db);
}
