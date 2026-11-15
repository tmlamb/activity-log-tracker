import type { SchemaTransaction } from "../database/migrations";
import type { PopulationTransaction } from "./population";
import type { LegacyKeyValueReader } from "./source";
import { migrateSchema } from "../database/migrations";
import { archiveLegacySource } from "./archive";
import { populateLegacyData, verifyAndMarkLegacyDataReady } from "./population";
import { captureLegacySource } from "./source";

interface ScratchDatabase {
  read<T>(
    job: (transaction: PopulationTransaction & SchemaTransaction) => Promise<T>,
  ): Promise<T>;
  write<T>(
    job: (transaction: PopulationTransaction & SchemaTransaction) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

export interface ConversionDryRunResult {
  counts: Record<string, number>;
  repairs: number;
  remappedIds: number;
  presetIdsCreated: number;
  elapsedMs: number;
}

/**
 * No legacy writes or cutover receipt: callers supply a dedicated scratch
 * database, never the application database. Reopen before verification.
 */
export async function runConversionDryRun(options: {
  source: LegacyKeyValueReader;
  open: () => Promise<ScratchDatabase>;
  remove: () => Promise<void>;
  now: () => number;
}): Promise<ConversionDryRunResult> {
  const started = options.now();
  let database: ScratchDatabase | undefined;
  let created = false;
  try {
    const source = await captureLegacySource(options.source);
    created = true;
    database = await options.open();
    await database.write(migrateSchema);
    await database.write((transaction) =>
      archiveLegacySource(transaction, source, "dry-run", started),
    );
    await database.write((transaction) => populateLegacyData(transaction, 1));
    const previous = database;
    database = undefined;
    await previous.close();
    database = await options.open();
    await database.write((transaction) =>
      verifyAndMarkLegacyDataReady(transaction, 1, options.now()),
    );
    const result = await database.read(async (transaction) => {
      const counts: Record<string, number> = {};
      for (const table of [
        "programs",
        "sessions",
        "activities",
        "workout_sets",
        "exercises",
        "exercise_presets",
        "barbells",
        "plates",
      ]) {
        const row = await transaction.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM ${table}`,
        );
        if (!row) throw new Error("Unable to read conversion totals.");
        counts[table] = row.count;
      }
      const report = await transaction.getFirstAsync<{ report: string }>(
        "SELECT report FROM conversion_reports WHERE snapshot_id = 1 AND verified_at IS NOT NULL",
      );
      if (!report)
        throw new Error("The verified conversion report is missing.");
      const parsed = JSON.parse(report.report) as {
        repairs: unknown[];
        identities: { pointer: string; original?: unknown; reason: string }[];
      };
      const isNewPresetId = ({
        pointer,
        original,
        reason,
      }: (typeof parsed.identities)[number]) =>
        pointer.startsWith("/presets/") &&
        original == null &&
        reason === "invalid";
      return {
        counts,
        repairs: parsed.repairs.length,
        presetIdsCreated: parsed.identities.filter(isNewPresetId).length,
        remappedIds: parsed.identities.filter(
          (identity) =>
            identity.reason !== "unchanged" && !isNewPresetId(identity),
        ).length,
      };
    });
    return { ...result, elapsedMs: Math.max(0, options.now() - started) };
  } finally {
    try {
      await database?.close();
    } finally {
      if (created) await options.remove();
    }
  }
}
