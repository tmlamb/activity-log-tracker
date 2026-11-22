export type BarChartTone = "primary" | "info" | "muted";
export type BarChartOutline = "dotted" | "solid";

export interface BarChartLine {
  text: string;
  strong?: boolean;
  tabularNumbers?: boolean;
}

/** A part of a bar stacked above its main value (see BarChartDisplay). */
export interface BarChartSegment {
  value: number;
  lines: BarChartLine[];
  tone?: BarChartTone;
  /** Outlined with a border of this style instead of filled. */
  outline?: BarChartOutline;
  /** Room for the segment's lines when it is small next to the others. */
  minimumHeight?: number;
}

export type BarChartDisplay =
  | {
      type: "bar";
      lines: BarChartLine[];
      tone?: BarChartTone;
      heightRatio?: number;
      minimumHeight?: number;
      outline?: BarChartOutline;
      /** A dotted part of the value still to come, above the rest. */
      pending?: {
        value: number;
        lines: BarChartLine[];
      };
      /**
       * Further parts of the value, stacked bottom to top above the others,
       * each with its own look.
       */
      segments?: BarChartSegment[];
    }
  | { type: "empty"; label: string }
  | { type: "message"; label: string };

/** The least height of a stacked segment, enough for one line. */
export const DEFAULT_SEGMENT_HEIGHT = 18;

export type ResolvedSegment = BarChartSegment & { tone: BarChartTone };

/**
 * A bar's parts, bottom to top: its own value (completed, when part is
 * pending), its pending part, then its further segments. Empty parts are left
 * out, but a bar always has at least one.
 */
export function barSegments(
  display: Extract<BarChartDisplay, { type: "bar" }>,
  value: number,
): ResolvedSegment[] {
  const tone = display.tone ?? "primary";
  const total = Math.max(value, 0);
  const stacked = (display.segments ?? []).map((segment) => ({
    ...segment,
    tone: segment.tone ?? tone,
    value: Math.max(segment.value, 0),
  }));
  const stackedValue = stacked.reduce((sum, item) => sum + item.value, 0);
  const pendingValue = Math.min(
    Math.max(display.pending?.value ?? 0, 0),
    Math.max(total - stackedValue, 0),
  );
  const ownValue = Math.max(total - stackedValue - pendingValue, 0);
  const segments: ResolvedSegment[] = [
    {
      value: ownValue,
      tone,
      outline: display.outline,
      lines: display.lines,
    },
    ...(display.pending && pendingValue > 0
      ? [
          {
            value: pendingValue,
            tone,
            outline: "dotted" as const,
            lines: display.pending.lines,
          },
        ]
      : []),
    ...stacked,
  ];
  const shown = segments.filter((segment) => segment.value > 0);
  return shown.length ? shown : segments.slice(0, 1);
}

/**
 * Split a bar's height between its segments by value, giving each at least
 * its minimum height, taken from the others in proportion to their spare room.
 */
export function segmentHeights(
  segments: readonly ResolvedSegment[],
  barHeight: number,
): number[] {
  if (segments.length <= 1) return [barHeight];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const minimums = segments.map(
    (segment) => segment.minimumHeight ?? DEFAULT_SEGMENT_HEIGHT,
  );
  const minimumTotal = minimums.reduce((sum, height) => sum + height, 0);
  if (minimumTotal >= barHeight)
    return minimums.map((height) => (height / minimumTotal) * barHeight);
  const heights = segments.map((segment, index) =>
    Math.max((segment.value / total) * barHeight, minimums[index] ?? 0),
  );
  const excess = heights.reduce((sum, height) => sum + height, 0) - barHeight;
  const spare = heights.map((height, index) => height - (minimums[index] ?? 0));
  const spareTotal = spare.reduce((sum, room) => sum + room, 0);
  return heights.map((height, index) =>
    spareTotal > 0
      ? height - (excess * (spare[index] ?? 0)) / spareTotal
      : height,
  );
}
