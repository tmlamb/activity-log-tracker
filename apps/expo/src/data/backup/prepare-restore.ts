import { prepareVersion1Restore } from "../lifecycle/restore-v1";
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
  if (version === 1)
    return { version: 1 as const, data: prepareVersion1Restore(contents) };
  if (version === 2)
    return { version: 2 as const, data: prepareVersion2Restore(contents) };
  throw new Error("The selected backup version is not supported.");
}
