import { describe, expect, it } from "vitest";

import type { Repair } from "./scalars";
import { repairDate, repairEnum, repairNumber } from "./scalars";

describe("legacy scalar repairs", () => {
  it("converts finite numeric strings without inventing measurements", () => {
    const repairs: Repair[] = [];
    expect(repairNumber(" 8.5 ", "/load", repairs)).toBe(8.5);
    expect(repairNumber("", "/reps", repairs)).toBeNull();
    expect(repairNumber(true, "/rest", repairs)).toBeNull();
    expect(repairNumber(-2.5, "/weight", repairs)).toBe(-2.5);
    expect(repairs.map(({ reason }) => reason)).toEqual([
      "numeric-string",
      "invalid-number",
      "invalid-number",
    ]);
  });

  it("preserves valid revived instants and reports invalid dates", () => {
    const repairs: Repair[] = [];
    expect(
      repairDate(new Date("2024-01-01T00:00:00.123Z"), "/start", repairs),
    ).toBe(1704067200123);
    expect(repairDate(new Date("invalid"), "/end", repairs)).toBeNull();
    expect(repairDate(undefined, "/absent", repairs)).toBeNull();
    expect(repairs).toHaveLength(1);
  });

  it("retains recognized values and reports a conservative fallback", () => {
    const repairs: Repair[] = [];
    const statuses = ["Planned", "Ready", "Done", "Incomplete"] as const;
    expect(repairEnum("Done", statuses, "Incomplete", "/status", repairs)).toBe(
      "Done",
    );
    expect(
      repairEnum("Unknown", statuses, "Incomplete", "/status", repairs),
    ).toBe("Incomplete");
    expect(repairs).toMatchObject([
      { pointer: "/status", original: "Unknown" },
    ]);
  });
});
