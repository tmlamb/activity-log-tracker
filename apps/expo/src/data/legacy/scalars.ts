export interface Repair {
  pointer: string;
  reason: string;
  original: unknown;
  replacement: unknown;
}

/** Repair only values that can be interpreted without inventing measurements. */
export function repairNumber(
  value: unknown,
  pointer: string,
  repairs: Repair[],
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      repairs.push({
        pointer,
        reason: "numeric-string",
        original: value,
        replacement: parsed,
      });
      return parsed;
    }
  }
  repairs.push({
    pointer,
    reason: "invalid-number",
    original: value,
    replacement: null,
  });
  return null;
}

/** Accept the Date produced by the legacy reviver, not guessed raw date formats. */
export function repairDate(
  value: unknown,
  pointer: string,
  repairs: Repair[],
): number | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }
  repairs.push({
    pointer,
    reason: "invalid-date",
    original: value,
    replacement: null,
  });
  return null;
}

export function repairEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  pointer: string,
  repairs: Repair[],
): T {
  if (typeof value === "string" && allowed.some((item) => item === value)) {
    return value as T;
  }
  repairs.push({
    pointer,
    reason: "invalid-enum",
    original: value,
    replacement: fallback,
  });
  return fallback;
}
