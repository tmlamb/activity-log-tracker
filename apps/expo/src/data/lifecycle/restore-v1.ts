import type { PopulationTransaction } from "../legacy/population";
import { parseActivityLogBackup } from "../../utils/app-data-backup";
import { prepareLegacyConversion } from "../legacy/conversion";
import { insertConvertedData } from "../legacy/population";
import {
  advanceGeneration,
  assertReadyGeneration,
  clearDomainData,
} from "./reset";

/** Parse and repair before asking the user to confirm replacement. */
export function prepareVersion1Restore(contents: string) {
  const stores = parseActivityLogBackup(contents);
  return prepareLegacyConversion({
    workout: JSON.stringify({ version: 2, state: stores["workout-storage"] }),
    exercises: JSON.stringify({
      version: 2,
      state: stores["exercise-storage"],
    }),
  });
}

/** Caller must run replacement and generation advancement in one writer job. */
export async function restoreVersion1Data(
  transaction: PopulationTransaction,
  expectedGeneration: number,
  prepared: ReturnType<typeof prepareVersion1Restore>,
) {
  await assertReadyGeneration(transaction, expectedGeneration);
  await clearDomainData(transaction);
  await insertConvertedData(transaction, prepared);
  return advanceGeneration(transaction, expectedGeneration);
}
