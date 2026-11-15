import "react-native-get-random-values";

import legacyStorage from "expo-sqlite/kv-store";
import { v4 as uuidv4 } from "uuid";

import { posthog } from "~/utils/posthog";
import { openApplicationDatabase } from "../database/connections";
import { bootstrapLegacyConversion } from "./bootstrap";

type ErrorDetails =
  | string
  | number
  | boolean
  | null
  | { [key: string]: ErrorDetails | ErrorDetails[] };

function errorDetails(error: unknown, seen = new Set<unknown>()): ErrorDetails {
  if (error instanceof Error) {
    if (seen.has(error)) return "[circular error]";
    seen.add(error);
    const code = (error as Error & { code?: unknown }).code;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      ...(typeof code === "string" || typeof code === "number" ? { code } : {}),
      ...(error.cause === undefined
        ? {}
        : { cause: errorDetails(error.cause, seen) }),
      ...(error instanceof AggregateError
        ? {
            errors: error.errors.map((item: unknown) =>
              errorDetails(item, seen),
            ),
          }
        : {}),
    };
  }
  if (
    typeof error === "string" ||
    typeof error === "number" ||
    typeof error === "boolean" ||
    error === null
  )
    return error;
  return { message: "Non-Error value thrown", value: String(typeof error) };
}

export function openMigratedApplicationData() {
  return bootstrapLegacyConversion({
    open: openApplicationDatabase,
    storage: legacyStorage,
    createDatabaseId: uuidv4,
    now: Date.now,
  }).catch((error: unknown) => {
    try {
      posthog?.capture("sqlite_migration_failed", {
        error: errorDetails(error),
      });
    } catch {
      // Reporting must not replace the migration error shown at startup.
    }
    throw error;
  });
}
