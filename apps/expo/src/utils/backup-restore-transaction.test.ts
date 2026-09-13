import { describe, expect, it } from "vitest";

import {
  ACTIVITY_LOG_RESTORE_TRANSACTION_KEY,
  beginActivityLogRestore,
  commitActivityLogRestore,
  recoverPendingActivityLogRestore,
  rollbackActivityLogRestore,
} from "./backup-restore-transaction";

class MemoryStorage {
  readonly values = new Map<string, string>();
  readonly failingWrites = new Set<string>();

  constructor(values: Record<string, string> = {}) {
    for (const [name, value] of Object.entries(values)) {
      this.values.set(name, value);
    }
  }

  getItem(name: string) {
    return this.values.get(name) ?? null;
  }

  setItem(name: string, value: string) {
    if (this.failingWrites.has(name)) throw new Error("Storage unavailable");
    this.values.set(name, value);
  }

  removeItem(name: string) {
    this.values.delete(name);
  }
}

describe("backup restore transactions", () => {
  it("restores both persisted stores after an interrupted restore", () => {
    const storage = new MemoryStorage({
      "workout-storage": "workout-before",
      "exercise-storage": "exercises-before",
    });

    beginActivityLogRestore(storage);
    storage.setItem("workout-storage", "workout-after");
    storage.setItem("exercise-storage", "exercises-after");

    expect(recoverPendingActivityLogRestore(storage)).toBe(true);
    expect(storage.getItem("workout-storage")).toBe("workout-before");
    expect(storage.getItem("exercise-storage")).toBe("exercises-before");
    expect(storage.getItem(ACTIVITY_LOG_RESTORE_TRANSACTION_KEY)).toBeNull();
  });

  it("keeps the journal and retries every store after a rollback failure", () => {
    const storage = new MemoryStorage({
      "workout-storage": "workout-before",
      "exercise-storage": "exercises-before",
    });

    beginActivityLogRestore(storage);
    storage.setItem("workout-storage", "workout-after");
    storage.setItem("exercise-storage", "exercises-after");
    storage.failingWrites.add("workout-storage");

    expect(rollbackActivityLogRestore(storage)).toBe(false);
    expect(storage.getItem("workout-storage")).toBe("workout-after");
    expect(storage.getItem("exercise-storage")).toBe("exercises-before");
    expect(
      storage.getItem(ACTIVITY_LOG_RESTORE_TRANSACTION_KEY),
    ).not.toBeNull();

    storage.failingWrites.clear();
    expect(recoverPendingActivityLogRestore(storage)).toBe(true);
    expect(storage.getItem("workout-storage")).toBe("workout-before");
    expect(storage.getItem("exercise-storage")).toBe("exercises-before");
  });

  it("keeps restored data after the transaction is committed", () => {
    const storage = new MemoryStorage({
      "workout-storage": "workout-before",
      "exercise-storage": "exercises-before",
    });

    beginActivityLogRestore(storage);
    storage.setItem("workout-storage", "workout-after");
    storage.setItem("exercise-storage", "exercises-after");

    expect(commitActivityLogRestore(storage)).toBe(true);
    expect(recoverPendingActivityLogRestore(storage)).toBe(true);
    expect(storage.getItem("workout-storage")).toBe("workout-after");
    expect(storage.getItem("exercise-storage")).toBe("exercises-after");
  });
});
