import legacyStorage from "expo-sqlite/kv-store";

import { captureLegacySource } from "./source";

/** Preserve raw source and undo journal without hydrating or modifying stores. */
export async function exportNativeRecoveryData() {
  const snapshot = await captureLegacySource(legacyStorage);
  return JSON.stringify(
    {
      format: "activity-log-recovery",
      version: 1,
      capturedAt: new Date().toISOString(),
      snapshot,
    },
    null,
    2,
  );
}
