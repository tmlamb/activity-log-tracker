import "react-native-get-random-values";

import legacyStorage from "expo-sqlite/kv-store";
import { v4 as uuidv4 } from "uuid";

import { openApplicationDatabase } from "../database/connections";
import { bootstrapLegacyConversion } from "./bootstrap";

/** The app provider will call this once all screens use the SQLite data layer. */
export function openMigratedApplicationData() {
  return bootstrapLegacyConversion({
    open: openApplicationDatabase,
    storage: legacyStorage,
    createDatabaseId: uuidv4,
    now: Date.now,
  });
}
