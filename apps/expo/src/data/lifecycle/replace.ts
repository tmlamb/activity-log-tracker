import type { Db } from "../database/db";
import type { Conversion } from "../legacy/population";
import { prepareLegacyConversion } from "../legacy/conversion";
import { insertConvertedData } from "../legacy/population";

/** Replace every domain row with `data`. Run inside a transaction. */
export function replaceDomainData(db: Db, data: Conversion) {
  // Ownership cascades remove sessions, activities and sets. Memberships and
  // catalog rows must be removed before their referenced labels and exercises.
  for (const table of [
    "programs",
    "exercise_muscles",
    "preset_muscles",
    "muscle_catalog",
    "exercises",
    "exercise_presets",
    "muscle_labels",
    "barbells",
    "plates",
  ])
    db.runSync(`DELETE FROM ${table}`);
  insertConvertedData(db, data);
}

/** The dataset a new install starts with. */
export function defaultDomainData() {
  return prepareLegacyConversion({ workout: null, exercises: null });
}
