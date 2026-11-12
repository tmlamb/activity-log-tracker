import { SCHEMA_V1, SCHEMA_VERSION } from "./schema";

export interface SchemaTransaction {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
}

/** Run inside the private writer's transaction, before opening data consumers. */
export async function migrateSchema(transaction: SchemaTransaction) {
  const result = await transaction.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if (!result || !Number.isInteger(result.user_version)) {
    throw new Error("Unable to determine the workout database schema version.");
  }
  if (result.user_version > SCHEMA_VERSION || result.user_version < 0) {
    throw new Error("This workout database requires a newer app version.");
  }
  if (result.user_version === 0) {
    await transaction.execAsync(SCHEMA_V1);
    await transaction.execAsync(
      `INSERT INTO schema_migrations(version, applied_at) VALUES (1, CAST(strftime('%s', 'now') AS INTEGER) * 1000); PRAGMA user_version = 1;`,
    );
  }
}
