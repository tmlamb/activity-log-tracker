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
