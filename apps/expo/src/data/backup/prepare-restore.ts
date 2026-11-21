import { parseActivityLogBackup } from "../../utils/app-data-backup";
import { prepareLegacyConversion } from "../legacy/conversion";
import { prepareVersion2Restore } from "./restore-v2";

/** Validate and prepare the selected portable format before confirmation. */
export function prepareApplicationRestore(contents: string) {
  let value: unknown;
  try {
    value = JSON.parse(contents) as unknown;
  } catch {
    throw new Error("The selected backup is not valid JSON.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("The selected file is not a valid Activity Log backup.");
  const version = (value as { version?: unknown }).version;
  if (version === 1) return prepareVersion1Restore(contents);
  // Versions 2 to 5 share a parser; version 3 added alternative exercises,
  // version 4 supersets and version 5 drop sets.
  if (version === 2 || version === 3 || version === 4 || version === 5)
    return prepareVersion2Restore(contents);
  throw new Error("The selected backup version is not supported.");
}

/** A version-1 backup holds the two legacy stores, so reuse their converter. */
function prepareVersion1Restore(contents: string) {
  const stores = parseActivityLogBackup(contents);
  return prepareLegacyConversion({
    workout: JSON.stringify({ version: 2, state: stores["workout-storage"] }),
    exercises: JSON.stringify({
      version: 2,
      state: stores["exercise-storage"],
    }),
  });
}
