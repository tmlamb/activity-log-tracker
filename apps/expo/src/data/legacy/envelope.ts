import { z } from "zod";

const envelope = z.object({
  state: z.record(z.string(), z.unknown()),
  /** Zustand only ran version migrations when this was a number. */
  version: z
    .number()
    .max(2, "The legacy store version is unsupported.")
    .optional(),
});

export type LegacyEnvelope = z.infer<typeof envelope>;

/** Read a persisted Zustand store; null when it was never written. */
export function parseLegacyEnvelope(raw: string | null): LegacyEnvelope | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The legacy store contains invalid JSON.");
  }
  return envelope.parse(parsed);
}
