import { v5 as uuidv5 } from "uuid";

// This namespace and the encoded input are part of converter version 1.
// Changing either would change repaired IDs when conversion is retried.
const CONVERSION_NAMESPACE = "6b03b2c8-7789-5d17-9e76-67d5a833699d";

export interface LegacyIdentity {
  /** JSON pointer to the entity, including its owning array positions. */
  pointer: string;
  original: unknown;
}

export interface IdentityMapping extends LegacyIdentity {
  id: string;
  reason: "unchanged" | "duplicate" | "invalid";
}

/**
 * Resolve one ownership scope at a time, in the order of lookup precedence.
 * Reserve every healthy source ID before generating any replacements so a
 * generated ID cannot displace a later, otherwise valid source ID.
 */
export function allocateLegacyIdentities(
  entity: string,
  identities: readonly LegacyIdentity[],
): IdentityMapping[] {
  const isValid = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;
  const reserved = new Set(
    identities.flatMap(({ original }) => (isValid(original) ? [original] : [])),
  );
  const used = new Set<string>();
  return identities.map(({ pointer, original }) => {
    const valid = isValid(original);
    if (valid && !used.has(original)) {
      used.add(original);
      return { pointer, original, id: original, reason: "unchanged" };
    }
    let attempt = 0;
    let id: string;
    do {
      id = uuidv5(
        JSON.stringify([entity, pointer, original, attempt++]),
        CONVERSION_NAMESPACE,
      );
    } while (reserved.has(id) || used.has(id));
    used.add(id);
    return { pointer, original, id, reason: valid ? "duplicate" : "invalid" };
  });
}
