const STORE_NAMES = ["workout-storage", "exercise-storage"] as const;

type StoreName = (typeof STORE_NAMES)[number];
type StoreSnapshot = Record<StoreName, string | null>;

export const ACTIVITY_LOG_RESTORE_TRANSACTION_KEY =
  "activity-log-restore-transaction";

export interface ActivityLogRestoreStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

interface PendingRestore {
  version: 1;
  stores: StoreSnapshot;
}

const getDefaultStorage = (): ActivityLogRestoreStorage =>
  (
    globalThis as typeof globalThis & {
      localStorage: ActivityLogRestoreStorage;
    }
  ).localStorage;

const parsePendingRestore = (value: string): PendingRestore | undefined => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed == null) return;

    const candidate = parsed as { version?: unknown; stores?: unknown };
    if (
      candidate.version !== 1 ||
      typeof candidate.stores !== "object" ||
      candidate.stores == null
    ) {
      return;
    }

    const stores = candidate.stores as Record<string, unknown>;
    const workout = stores["workout-storage"];
    const exercises = stores["exercise-storage"];
    if (
      (typeof workout !== "string" && workout !== null) ||
      (typeof exercises !== "string" && exercises !== null)
    ) {
      return;
    }

    return {
      version: 1,
      stores: {
        "workout-storage": workout,
        "exercise-storage": exercises,
      },
    };
  } catch {
    return;
  }
};

const restoreSnapshot = (
  storage: ActivityLogRestoreStorage,
  snapshot: StoreSnapshot,
) => {
  let succeeded = true;

  for (const storeName of STORE_NAMES) {
    try {
      const value = snapshot[storeName];
      if (value == null) {
        storage.removeItem(storeName);
      } else {
        storage.setItem(storeName, value);
      }
    } catch {
      succeeded = false;
    }
  }

  return succeeded;
};

export const recoverPendingActivityLogRestore = (
  storage = getDefaultStorage(),
) => {
  let serializedRestore: string | null;

  try {
    serializedRestore = storage.getItem(ACTIVITY_LOG_RESTORE_TRANSACTION_KEY);
  } catch {
    return false;
  }

  if (serializedRestore == null) return true;

  const pendingRestore = parsePendingRestore(serializedRestore);
  if (!pendingRestore || !restoreSnapshot(storage, pendingRestore.stores)) {
    return false;
  }

  try {
    storage.removeItem(ACTIVITY_LOG_RESTORE_TRANSACTION_KEY);
    return true;
  } catch {
    return false;
  }
};

export const beginActivityLogRestore = (storage = getDefaultStorage()) => {
  if (!recoverPendingActivityLogRestore(storage)) {
    throw new Error("A previous data restore could not be recovered.");
  }

  const pendingRestore: PendingRestore = {
    version: 1,
    stores: {
      "workout-storage": storage.getItem("workout-storage"),
      "exercise-storage": storage.getItem("exercise-storage"),
    },
  };

  storage.setItem(
    ACTIVITY_LOG_RESTORE_TRANSACTION_KEY,
    JSON.stringify(pendingRestore),
  );
};

export const commitActivityLogRestore = (storage = getDefaultStorage()) => {
  try {
    storage.removeItem(ACTIVITY_LOG_RESTORE_TRANSACTION_KEY);
    return true;
  } catch {
    return false;
  }
};

export const rollbackActivityLogRestore = recoverPendingActivityLogRestore;
