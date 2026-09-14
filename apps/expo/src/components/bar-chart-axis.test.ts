import { describe, expect, it } from "vitest";

import { getBarChartTickValues } from "./bar-chart-axis";

describe("getBarChartTickValues", () => {
  it("uses the maximum, midpoint, and zero by default", () => {
    expect(getBarChartTickValues(12)).toEqual([12, 6, 0]);
  });

  it("returns ticks at the requested interval below the maximum", () => {
    expect(getBarChartTickValues(12, 5)).toEqual([10, 5, 0]);
  });

  it("includes the maximum when it falls on the interval", () => {
    expect(getBarChartTickValues(10, 5)).toEqual([10, 5, 0]);
  });
});
