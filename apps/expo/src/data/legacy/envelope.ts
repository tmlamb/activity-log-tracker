import { dateRegex } from "@activity-log/ui/utils";

export interface LegacyEnvelope {
  state: Record<string, unknown>;
  /** Zustand only ran version migrations when this was a number. */
  version: number | undefined;
}

/** Parse without initializing a persisted store or discarding unknown fields. */
export function parseLegacyEnvelope(
  raw: string | null,
  reviveDates = false,
): LegacyEnvelope | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw, (key: string, value: unknown): unknown => {
      if (
        reviveDates &&
        (key === "start" || key === "end" || key === "lastActivityAt") &&
        typeof value === "string" &&
        dateRegex.test(value)
      ) {
        return new Date(value);
      }
      return value;
    });
  } catch {
    throw new Error("The legacy store contains invalid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("The legacy store envelope is invalid.");
  }
  const envelope = parsed as { state?: unknown; version?: unknown };
  if (
    typeof envelope.state !== "object" ||
    envelope.state === null ||
    Array.isArray(envelope.state)
  ) {
    throw new Error("The legacy store state is invalid.");
  }
  const version =
    typeof envelope.version === "number" ? envelope.version : undefined;
  if (version !== undefined && (!Number.isFinite(version) || version > 2)) {
    throw new Error("The legacy store version is unsupported.");
  }
  return { state: envelope.state as Record<string, unknown>, version };
}
