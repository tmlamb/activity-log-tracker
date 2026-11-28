import { openDatabaseSync } from "expo-sqlite";
import legacyStorage from "expo-sqlite/kv-store";

import type { Db } from "./database/db";
import { bootstrapDatabase } from "./legacy/bootstrap";

/** Open the app database, creating it and importing legacy data on first launch. */
export function openDatabase(): Db {
  const db = openDatabaseSync("activity-log.sqlite");
  try {
    db.execSync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    bootstrapDatabase(db, legacyStorage);
    return db;
  } catch (error) {
    db.closeSync();
    throw error;
  }
}

/**
 * Keep SQLite's table statistics current. Without them the query planner can
 * pick plans that read a whole table per row, which took seconds on a long
 * history. Usually a no-op: it analyzes a table only when it has no
 * statistics or has grown or shrunk ten-fold. 0x10000 checks every table, as
 * a new connection has queried none yet; 0x10 caps how much of each index is
 * read, so the first run on a large database stays fast.
 */
export function optimizeDatabase(db: Db) {
  db.execSync("PRAGMA optimize=0x10012;");
}
