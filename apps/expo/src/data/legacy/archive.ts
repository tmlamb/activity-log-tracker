import type { LegacySnapshot, LegacyStorePair } from "./source";
import { selectLegacySource } from "./source";

export interface ArchiveTransaction {
  getFirstAsync<T>(
    sql: string,
    ...parameters: (string | number)[]
  ): Promise<T | null>;
  runAsync(
    sql: string,
    ...parameters: (string | number | null)[]
  ): Promise<unknown>;
}

export interface ArchivedSource {
  snapshotId: number;
  databaseId: string;
  capturedAt: number;
  snapshot: LegacySnapshot;
  source: LegacyStorePair;
}

interface BootstrapRow {
  database_id: string;
  state: "source-captured" | "awaiting-verification" | "ready";
}

interface SnapshotRow {
  id: number;
  workout: string | null;
  exercises: string | null;
  restore_journal: string | null;
  captured_at: number;
}

/**
 * Archive a source inside the private writer transaction. Repeated calls must
 * reuse the first captured bytes; never take a new snapshot after interruption.
 */
export async function archiveLegacySource(
  transaction: ArchiveTransaction,
  proposed: LegacySnapshot,
  databaseId: string,
  capturedAt: number,
): Promise<ArchivedSource> {
  const state = await transaction.getFirstAsync<BootstrapRow>(
    "SELECT database_id, state FROM bootstrap_state WHERE singleton = 1",
  );
  if (state && state.state !== "source-captured") {
    throw new Error(
      "The target database has already moved past source capture.",
    );
  }

  let row = await transaction.getFirstAsync<SnapshotRow>(
    "SELECT id, workout, exercises, restore_journal, captured_at FROM conversion_snapshots ORDER BY id LIMIT 1",
  );
  if (state && !row) {
    throw new Error("The captured legacy snapshot is missing.");
  }
  if (!state && row) {
    throw new Error("The legacy snapshot has no matching bootstrap state.");
  }
  if (!row) {
    // Validate the journal before publishing a snapshot as an import source.
    selectLegacySource(proposed);
    await transaction.runAsync(
      "INSERT INTO bootstrap_state(singleton, database_id, state) VALUES (1, ?, 'source-captured')",
      databaseId,
    );
    await transaction.runAsync(
      "INSERT INTO conversion_snapshots(id, workout, exercises, restore_journal, captured_at) VALUES (1, ?, ?, ?, ?)",
      proposed.workout,
      proposed.exercises,
      proposed.restoreJournal,
      capturedAt,
    );
    row = {
      id: 1,
      workout: proposed.workout,
      exercises: proposed.exercises,
      restore_journal: proposed.restoreJournal,
      captured_at: capturedAt,
    };
  }
  const snapshot: LegacySnapshot = {
    workout: row.workout,
    exercises: row.exercises,
    restoreJournal: row.restore_journal,
  };
  return {
    snapshotId: row.id,
    databaseId: state?.database_id ?? databaseId,
    capturedAt: row.captured_at,
    snapshot,
    source: selectLegacySource(snapshot),
  };
}
