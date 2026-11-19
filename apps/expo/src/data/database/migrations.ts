import type { Db } from "./db";
import { ACTIVITY_ALTERNATIVES_MIGRATION } from "./activity-alternatives-migration";
import { SCHEMA } from "./schema";

/**
 * Every schema change, in order. Step N takes a database from version N - 1 to
 * N; the version is stored in `PRAGMA user_version`.
 *
 * Only ever append a step. Never edit or reorder one that has shipped: devices
 * that already ran it will not run it again.
 */
export const MIGRATIONS: readonly string[] = [
  // 1: the initial relational schema.
  SCHEMA,
  // 2: alternative exercises (activities.parent_activity_id).
  ACTIVITY_ALTERNATIVES_MIGRATION,
];

/** Every step in order: the current schema, for tests that build databases. */
export const CURRENT_SCHEMA = MIGRATIONS.join("\n");

/**
 * Apply the steps this database hasn't run yet and record the new version.
 * Run inside a transaction so a failed step leaves the database unchanged.
 * Returns the version the database was at before migrating (0 when new).
 */
export function migrateDatabase(
  db: Db,
  migrations: readonly string[] = MIGRATIONS,
) {
  const from =
    db.getFirstSync<{ user_version: number }>("PRAGMA user_version")
      ?.user_version ?? 0;
  if (from > migrations.length)
    throw new Error("This workout database requires a newer app version.");
  for (const step of migrations.slice(from)) db.execSync(step);
  if (from < migrations.length)
    db.execSync(`PRAGMA user_version = ${migrations.length}`);
  return from;
}
