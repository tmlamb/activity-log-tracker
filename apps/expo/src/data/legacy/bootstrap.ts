import type { Db } from "../database/db";
import { transaction } from "../database/db";
import { SCHEMA, SCHEMA_VERSION } from "../database/schema";
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
 * On first launch, create the schema and import the legacy stores in one
 * transaction, so a failed import leaves the legacy stores for the next launch.
 */
export function bootstrapDatabase(db: Db, storage: LegacyStorage) {
  const version =
    db.getFirstSync<{ user_version: number }>("PRAGMA user_version")
      ?.user_version ?? 0;
  if (version > SCHEMA_VERSION)
    throw new Error("This workout database requires a newer app version.");
  if (version === 0)
    transaction(db, () => {
      db.execSync(SCHEMA);
      insertConvertedData(
        db,
        prepareLegacyConversion({
          workout: storage.getItemSync("workout-storage"),
          exercises: storage.getItemSync("exercise-storage"),
        }),
      );
      db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  for (const key of LEGACY_KEYS) storage.removeItemSync(key);
}
