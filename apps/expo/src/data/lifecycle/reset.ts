import type { PopulationTransaction } from "../legacy/population";
import { prepareLegacyConversion } from "../legacy/conversion";
import { insertConvertedData } from "../legacy/population";

/** Clear only domain tables; operational authority remains under caller control. */
export async function clearDomainData(transaction: PopulationTransaction) {
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
  ]) {
    await transaction.runAsync(`DELETE FROM ${table}`);
  }
}

export async function assertReadyGeneration(
  transaction: PopulationTransaction,
  expectedGeneration: number,
) {
  const state = await transaction.getFirstAsync<{
    state: string;
    generation: number;
  }>("SELECT state, generation FROM bootstrap_state WHERE singleton = 1");
  if (state?.state !== "ready" || state.generation !== expectedGeneration)
    throw new Error("The workout dataset has changed. Reopen this screen.");
  if (!Number.isSafeInteger(state.generation + 1))
    throw new Error("The workout dataset generation cannot be advanced.");
}

export async function advanceGeneration(
  transaction: PopulationTransaction,
  expectedGeneration: number,
) {
  const nextGeneration = expectedGeneration + 1;
  const updated = await transaction.runAsync(
    "UPDATE bootstrap_state SET generation = ? WHERE singleton = 1 AND state = 'ready' AND generation = ?",
    nextGeneration,
    expectedGeneration,
  );
  if (updated.changes !== 1)
    throw new Error("The workout dataset has changed. Reopen this screen.");
  return nextGeneration;
}

/**
 * Reset only within the application's serialized writer transaction. The
 * bootstrap identity and external retirement receipt are deliberately retained.
 * Accepted older writes finish first; later writes fail their generation check.
 */
export async function resetApplicationData(
  transaction: PopulationTransaction,
  expectedGeneration: number,
): Promise<number> {
  await assertReadyGeneration(transaction, expectedGeneration);

  const defaults = prepareLegacyConversion({ workout: null, exercises: null });
  // Ownership cascades remove sessions, activities and sets. Memberships and
  // catalog rows must be removed before their referenced labels and exercises.
  await clearDomainData(transaction);
  await transaction.runAsync("DELETE FROM conversion_snapshots");
  await insertConvertedData(transaction, defaults);
  return advanceGeneration(transaction, expectedGeneration);
}
