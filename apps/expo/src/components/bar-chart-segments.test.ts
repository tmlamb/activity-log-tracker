import { describe, expect, it } from "vitest";

import { barSegments, segmentHeights } from "./bar-chart-segments";

const lines = (text: string) => [{ text }];

describe("barSegments", () => {
  it("is one segment for a plain bar", () => {
    expect(
      barSegments({ type: "bar", lines: lines("4"), dotted: true }, 4),
    ).toEqual([{ value: 4, tone: "primary", dotted: true, lines: lines("4") }]);
  });

  it("stacks completed, pending, then further segments, leaving out empty ones", () => {
    const segments = barSegments(
      {
        type: "bar",
        lines: [],
        pending: { value: 2, lines: lines("2") },
        segments: [
          { value: 1, tone: "muted", lines: lines("1 Drop") },
          { value: 0, tone: "muted", dotted: true, lines: lines("0 Drop") },
        ],
      },
      3,
    );
    // Nothing is completed: the pending and drop parts make up the bar.
    expect(
      segments.map(({ value, tone, dotted }) => [value, tone, !!dotted]),
    ).toEqual([
      [2, "primary", true],
      [1, "muted", false],
    ]);
  });
});

describe("segmentHeights", () => {
  const segment = (value: number, minimumHeight?: number) => ({
    value,
    tone: "primary" as const,
    lines: [],
    minimumHeight,
  });

  it("splits the height by value", () => {
    expect(segmentHeights([segment(3), segment(1)], 100)).toEqual([75, 25]);
  });

  it("keeps each segment's minimum height, taken from the others", () => {
    const heights = segmentHeights([segment(9), segment(1, 30)], 100);
    expect(heights).toEqual([70, 30]);
    expect(
      segmentHeights([segment(1, 40), segment(1, 40)], 60).reduce(
        (total, height) => total + height,
      ),
    ).toBe(60);
  });
});
