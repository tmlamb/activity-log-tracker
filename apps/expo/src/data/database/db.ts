/** A value SQLite can bind. */
export type SqlValue = string | number | null;

/**
 * The synchronous subset of expo-sqlite's `SQLiteDatabase` the app uses.
 * Tests satisfy it with `node:sqlite` (see `test-db.ts`).
 */
export interface Db {
  getAllSync<T>(sql: string, ...parameters: SqlValue[]): T[];
  getFirstSync<T>(sql: string, ...parameters: SqlValue[]): T | null;
  runSync(sql: string, ...parameters: SqlValue[]): { changes: number };
  execSync(sql: string): void;
}

/** Run `job` in one write transaction, rolling back if it throws. */
export function transaction<T>(db: Db, job: () => T): T {
  db.execSync("BEGIN IMMEDIATE");
  try {
    const result = job();
    db.execSync("COMMIT");
    return result;
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}
