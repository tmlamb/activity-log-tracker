import { z } from "zod";

import { dateRegex } from "@activity-log/ui/utils";

/**
 * Lenient field schemas for the retired stores. A field that cannot be read
 * becomes null (or a safe default) rather than failing the whole import.
 */

/** A finite number, also accepting numeric strings such as "8". */
export const measurement = z.union([
  z.number(),
  z.string().trim().min(1).pipe(z.coerce.number()),
]);
export const number = measurement.nullable().catch(null);

/** A non-blank string, or null. */
export const text = z
  .string()
  .refine((value) => value.trim().length > 0)
  .nullable()
  .catch(null);

export const unit = z.enum(["lbs", "kg"]);
export const weight = z
  .object({ value: measurement, unit })
  .nullable()
  .catch(null);
export const loadKind = z
  .enum(["BARBELL", "WEIGHT_PAIR", "SINGLE_WEIGHT"])
  .nullable()
  .catch(null);

/** The stores persisted Dates as ISO strings; read them as epoch ms. */
export const instant = z
  .string()
  .regex(dateRegex)
  .pipe(z.coerce.date())
  .transform((date) => date.getTime())
  .nullable()
  .catch(null);

/** An array that skips items which don't match (e.g. nulls); [] if missing. */
export function list<T extends z.ZodType>(item: T) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((value) => {
        const parsed = item.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      }),
    );
}
