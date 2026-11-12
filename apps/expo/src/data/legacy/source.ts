export interface LegacySnapshot {
  workout: string | null;
  exercises: string | null;
  restoreJournal: string | null;
}

export interface LegacyStorePair {
  workout: string | null;
  exercises: string | null;
}

/** An interrupted restore's journal contains the pair from before the restore. */
export function selectLegacySource(snapshot: LegacySnapshot): LegacyStorePair {
  if (snapshot.restoreJournal === null) {
    return { workout: snapshot.workout, exercises: snapshot.exercises };
  }

  let journal: unknown;
  try {
    journal = JSON.parse(snapshot.restoreJournal);
  } catch {
    throw new Error("The pending legacy restore journal is invalid.");
  }

  if (
    typeof journal !== "object" ||
    journal === null ||
    Array.isArray(journal)
  ) {
    throw new Error("The pending legacy restore journal is invalid.");
  }
  const candidate = journal as { version?: unknown; stores?: unknown };
  if (
    candidate.version !== 1 ||
    typeof candidate.stores !== "object" ||
    candidate.stores === null ||
    Array.isArray(candidate.stores)
  ) {
    throw new Error("The pending legacy restore journal is invalid.");
  }
  const stores = candidate.stores as Record<string, unknown>;
  const workout = stores["workout-storage"];
  const exercises = stores["exercise-storage"];
  if (
    (typeof workout !== "string" && workout !== null) ||
    (typeof exercises !== "string" && exercises !== null)
  ) {
    throw new Error("The pending legacy restore journal is invalid.");
  }
  return { workout, exercises };
}

export interface LegacyKeyValueReader {
  getItemAsync(key: string): Promise<string | null>;
}

/** Capture raw values without hydrating or writing either legacy Zustand store. */
export async function captureLegacySource(
  storage: LegacyKeyValueReader,
): Promise<LegacySnapshot> {
  const restoreJournal = await storage.getItemAsync(
    "activity-log-restore-transaction",
  );
  const workout = await storage.getItemAsync("workout-storage");
  const exercises = await storage.getItemAsync("exercise-storage");
  return { workout, exercises, restoreJournal };
}
