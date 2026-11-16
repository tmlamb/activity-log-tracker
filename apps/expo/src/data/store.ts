import { useMemo, useState, useSyncExternalStore } from "react";
import { useIsFocused } from "expo-router/react-navigation";

import type { Db } from "./database/db";
import { transaction } from "./database/db";

/**
 * The open database plus a change counter. Every committed write bumps the
 * counter, and `useRead` re-runs its synchronous query when it changes.
 */
let database: Db | undefined;
let version = 0;
/** Advances when the whole dataset is replaced, so screens remount. */
let generation = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setDatabase(db: Db | undefined) {
  database = db;
  generation++;
  notify();
}

export function getDb(): Db {
  if (!database) throw new Error("The workout database is not open.");
  return database;
}

/** Run a read outside of render, e.g. in an event handler. */
export function read<T>(job: (db: Db) => T): T {
  return job(getDb());
}

/** Run `job` in a transaction, then refresh every mounted reader. */
export function write<T>(job: (db: Db) => T): T {
  const db = getDb();
  const result = transaction(db, () => job(db));
  notify();
  return result;
}

/** Like `write`, for operations that replace the whole dataset. */
export function replaceDataset(job: (db: Db) => void) {
  const db = getDb();
  transaction(db, () => job(db));
  generation++;
  notify();
}

/** Re-run every mounted reader, e.g. when the clock has moved on. */
export function refresh() {
  notify();
}

export function useGeneration() {
  return useSyncExternalStore(subscribe, () => generation);
}

/**
 * Synchronously read from the database during render. Pass a stable `job` (a
 * module-level function, or one wrapped in `useCallback`); the result is reused
 * until `job` changes or a write commits while the screen is focused. Screens
 * in the background keep their last result until they regain focus.
 */
export function useRead<T>(job: (db: Db) => T): T {
  // React Compiler would drop `void seen` below and memoize on `job` alone,
  // so screens would never re-read after a write. Keep this hook uncompiled.
  "use no memo";
  const focused = useIsFocused();
  const latest = useSyncExternalStore(subscribe, () => version);
  const [seen, setSeen] = useState(latest);
  if (focused && seen !== latest) setSeen(latest);
  // `seen` is the cache key: re-read when it changes, even though `job` doesn't use it.
  return useMemo(() => {
    void seen;
    return job(getDb());
  }, [job, seen]);
}
