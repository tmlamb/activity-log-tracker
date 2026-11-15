import { deleteDatabaseAsync, openDatabaseAsync } from "expo-sqlite";
import legacyStorage from "expo-sqlite/kv-store";

import { openApplicationDatabase } from "../database/connections";
import { runConversionDryRun } from "./dry-run";

const name = "activity-log-conversion-test.sqlite";
let running = false;

/** Uses a dedicated, app-private scratch file; never opens the target database. */
export async function runNativeConversionDryRun() {
  if (running) throw new Error("A conversion test is already running.");
  running = true;
  try {
    // Opening ensures the file exists even on the first run. Remove it before
    // use to retire any scratch data left by a previously interrupted test.
    const previous = await openDatabaseAsync(name, { useNewConnection: true });
    await previous.closeAsync();
    await deleteDatabaseAsync(name);
    return await runConversionDryRun({
      source: legacyStorage,
      open: () => openApplicationDatabase(name),
      remove: () => deleteDatabaseAsync(name),
      now: Date.now,
    });
  } finally {
    running = false;
  }
}
