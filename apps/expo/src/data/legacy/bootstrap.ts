import type { SchemaTransaction } from "../database/migrations";
import type { PopulationTransaction } from "./population";
import { migrateSchema } from "../database/migrations";
import { archiveLegacySource } from "./archive";
import { populateLegacyData, verifyAndMarkLegacyDataReady } from "./population";
import { captureLegacySource } from "./source";

const CUTOVER_KEY = "activity-log-sqlite-cutover";

interface ManagedDatabase {
  read<T>(
    job: (transaction: PopulationTransaction & SchemaTransaction) => Promise<T>,
  ): Promise<T>;
  write<T>(
    job: (transaction: PopulationTransaction & SchemaTransaction) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

interface LegacyStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<unknown>;
}

interface BootstrapRow {
  database_id: string;
  state: "source-captured" | "awaiting-verification" | "ready";
}

function receiptId(raw: string | null): string | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The database cutover receipt is invalid.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The database cutover receipt is invalid.");
  }
  const receipt = value as { version?: unknown; databaseId?: unknown };
  if (
    receipt.version !== 1 ||
    typeof receipt.databaseId !== "string" ||
    !receipt.databaseId.trim()
  ) {
    throw new Error("The database cutover receipt is invalid.");
  }
  return receipt.databaseId;
}

/**
 * Initialize and verify before exposing the database to consumers. The caller
 * owns the returned database and must close it when the data provider stops.
 */
export async function bootstrapLegacyConversion(options: {
  open: () => Promise<ManagedDatabase>;
  storage: LegacyStorage;
  createDatabaseId: () => string;
  now: () => number;
}): Promise<ManagedDatabase> {
  const receipt = receiptId(await options.storage.getItemAsync(CUTOVER_KEY));
  let database: ManagedDatabase | undefined = await options.open();
  try {
    await database.write(migrateSchema);
    let state = await database.read((transaction) =>
      transaction.getFirstAsync<BootstrapRow>(
        "SELECT database_id, state FROM bootstrap_state WHERE singleton = 1",
      ),
    );
    if (!state) {
      if (receipt !== null)
        throw new Error(
          "The previously converted database is missing. Recovery is required.",
        );
      const source = await captureLegacySource(options.storage);
      const archived = await database.write((transaction) =>
        archiveLegacySource(
          transaction,
          source,
          options.createDatabaseId(),
          options.now(),
        ),
      );
      state = { database_id: archived.databaseId, state: "source-captured" };
    }
    if (receipt !== null && receipt !== state.database_id) {
      throw new Error(
        "The database does not match the cutover receipt. Recovery is required.",
      );
    }
    if (receipt !== null && state.state !== "ready") {
      throw new Error(
        "The converted database is not ready. Recovery is required.",
      );
    }
    if (state.state === "source-captured") {
      const snapshot = await database.read((transaction) =>
        transaction.getFirstAsync<{ id: number }>(
          "SELECT id FROM conversion_snapshots ORDER BY id LIMIT 1",
        ),
      );
      if (!snapshot)
        throw new Error("The captured legacy snapshot is missing.");
      await database.write((transaction) =>
        populateLegacyData(transaction, snapshot.id),
      );
      state = { ...state, state: "awaiting-verification" };
    }
    if (state.state === "awaiting-verification") {
      const snapshot = await database.read((transaction) =>
        transaction.getFirstAsync<{ id: number }>(
          "SELECT id FROM conversion_snapshots ORDER BY id LIMIT 1",
        ),
      );
      if (!snapshot)
        throw new Error("The captured legacy snapshot is missing.");
      const previous = database;
      database = undefined;
      await previous.close();
      database = await options.open();
      await database.write((transaction) =>
        verifyAndMarkLegacyDataReady(transaction, snapshot.id, options.now()),
      );
      state = { ...state, state: "ready" };
    }
    if (receipt === null) {
      await options.storage.setItemAsync(
        CUTOVER_KEY,
        JSON.stringify({ version: 1, databaseId: state.database_id }),
      );
    }
    return database;
  } catch (error) {
    await database?.close();
    throw error;
  }
}
