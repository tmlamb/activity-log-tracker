import type { Db } from "../database/db";
import { transaction } from "../database/db";
import { migrateDatabase } from "../database/migrations";
import { prepareLegacyConversion } from "./conversion";
import { insertConvertedData } from "./population";

/** Keys written by the retired single-JSON stores. */
const LEGACY_KEYS = [
  "workout-storage",
  "exercise-storage",
  "activity-log-restore-transaction",
];

interface LegacyStorage {
  getItemSync(key: string): string | null;
  removeItemSync(key: string): unknown;
}

/**
 * Bring the database up to date. On first launch that also imports the legacy
 * stores, in the same transaction, so a failed import leaves them in place for
 * the next launch.
 */
export function bootstrapDatabase(db: Db, storage: LegacyStorage) {
  transaction(db, () => {
    const from = migrateDatabase(db);
    if (from === 0)
      insertConvertedData(
        db,
        prepareLegacyConversion({
          workout: storage.getItemSync("workout-storage"),
          exercises: storage.getItemSync("exercise-storage"),
        }),
      );
  });
  for (const key of LEGACY_KEYS) storage.removeItemSync(key);
}
