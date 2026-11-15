import { v5 as uuidv5 } from "uuid";

// Name-based IDs need no random number generator, which the native runtime
// may not have installed yet when the import runs at first launch.
const NAMESPACE = "6b03b2c8-7789-5d17-9e76-67d5a833699d";

/**
 * Pair each of a list of siblings (e.g. the sessions of one program) with its
 * ID. An item keeps its legacy ID unless that is missing or repeats an earlier
 * sibling's; then it gets a new one, so primary keys stay unique.
 */
export function withIds<T>(
  kind: string,
  items: readonly T[],
  legacyId: (item: T) => string | null,
) {
  const used = new Set<string>();
  return items.map((item, index) => {
    const original = legacyId(item);
    const id =
      original !== null && !used.has(original)
        ? original
        : uuidv5(`${kind}/${index}`, NAMESPACE);
    used.add(id);
    return { id, item };
  });
}
