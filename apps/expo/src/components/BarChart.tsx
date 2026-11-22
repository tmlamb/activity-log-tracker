import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { FadeOut } from "react-native-reanimated";

import type { BarChartDisplay, BarChartTone } from "./bar-chart-segments";
import { getBarChartTickValues } from "./bar-chart-axis";
import {
  barSegments,
  DEFAULT_SEGMENT_HEIGHT,
  segmentHeights,
} from "./bar-chart-segments";
import { Text } from "./font-scale-text";
import { AnimatedViewStyled, LegendListStyled } from "./Styled";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export const formatBarChartValue = (value: number) => {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return numberFormatter.format(value);
};

export type {
  BarChartDisplay,
  BarChartLine,
  BarChartSegment,
  BarChartTone,
} from "./bar-chart-segments";

export interface BarChartPoint {
  key: string;
  value: number;
  label: string;
  accessibilityLabel: string;
  emphasized?: boolean;
  faded?: boolean;
  display: BarChartDisplay;
}

export interface BarChartProps {
  valueAxisLabel: string;
  valueAxisTickInterval?: number;
  points: readonly BarChartPoint[];
  initialScrollIndex?: number;
}

const toneClasses: Record<
  BarChartTone,
  { container: string; text: string; border: string; outlinedText: string }
> = {
  primary: {
    container: "bg-primary",
    text: "text-primary-foreground",
    border: "border-primary",
    outlinedText: "text-primary",
  },
  info: {
    container: "bg-info",
    text: "text-info-foreground",
    border: "border-info",
    outlinedText: "text-info",
  },
  muted: {
    container: "bg-muted",
    text: "text-muted-foreground",
    border: "border-muted",
    outlinedText: "text-muted",
  },
};

export default function BarChart({
  valueAxisLabel,
  valueAxisTickInterval,
  points,
  initialScrollIndex = 0,
}: BarChartProps) {
  const { width } = useWindowDimensions();
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = Math.max(width - 80, 240);
  const yAxisWidth = 42;
  const plotWidth = chartWidth - yAxisWidth;
  const maxBarHeight = 128;
  const tickLabelHeight = 16;
  const labelAxisHeight = 32;
  const columnWidth = plotWidth / 5;
  const barWidth = Math.min(58, Math.max(columnWidth - 10, 34));
  const boundedInitialScrollIndex = points.length
    ? Math.min(Math.max(initialScrollIndex, 0), points.length - 1)
    : undefined;
  const itemLayoutVersion = `${chartWidth}:${maxValue}`;
  const valueAxisTicks = getBarChartTickValues(maxValue, valueAxisTickInterval);
  const valueAxisPosition = (value: number) =>
    (1 - value / maxValue) * maxBarHeight;
  const [chartLoaded, setChartLoaded] = useState(false);

  return (
    <View className="relative" style={{ width: chartWidth }}>
      <Text maxFontSizeMultiplier={1.5} className="text-muted mb-1 font-medium">
        {valueAxisLabel}
      </Text>
      <View className="flex-row">
        <View style={{ width: yAxisWidth }}>
          <View className="relative" style={{ height: maxBarHeight }}>
            {valueAxisTicks.map((value) => (
              <Text
                key={value}
                maxFontSizeMultiplier={1.5}
                numberOfLines={1}
                className="text-muted pr-2 text-right text-xs tabular-nums"
                style={{
                  position: "absolute",
                  top: Math.min(
                    Math.max(valueAxisPosition(value) - tickLabelHeight / 2, 0),
                    maxBarHeight - tickLabelHeight,
                  ),
                  width: yAxisWidth,
                }}
              >
                {formatBarChartValue(value)}
              </Text>
            ))}
          </View>
          <View style={{ height: labelAxisHeight }} />
        </View>

        <View className="relative overflow-hidden" style={{ width: plotWidth }}>
          <View
            pointerEvents="none"
            className="absolute top-0 right-0 left-0"
            style={{ height: maxBarHeight }}
          >
            {valueAxisTicks.map((value) => (
              <View
                key={value}
                className="border-border absolute right-0 left-0 border-t"
                style={{ top: valueAxisPosition(value) }}
              />
            ))}
          </View>

          <LegendListStyled
            data={points}
            extraData={itemLayoutVersion}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={boundedInitialScrollIndex}
            recycleItems={false}
            maintainVisibleContentPosition={false}
            onLoad={() => setChartLoaded(true)}
            style={{ width: plotWidth }}
            contentContainerClassName="items-end"
            keyExtractor={(point) => point.key}
            getFixedItemSize={() => columnWidth}
            renderItem={({ item: point }) => {
              const { display } = point;
              const tone =
                display.type === "bar" ? (display.tone ?? "primary") : null;
              const segments =
                display.type === "bar" ? barSegments(display, point.value) : [];
              const barHeight =
                display.type === "bar"
                  ? Math.min(
                      Math.max(
                        (display.heightRatio ?? point.value / maxValue) *
                          maxBarHeight,
                        display.minimumHeight ?? 58,
                        segments.length > 1
                          ? segments.reduce(
                              (total, segment) =>
                                total +
                                (segment.minimumHeight ??
                                  DEFAULT_SEGMENT_HEIGHT),
                              0,
                            )
                          : 0,
                      ),
                      maxBarHeight,
                    )
                  : 0;
              const heights = segmentHeights(segments, barHeight);
              return (
                <View
                  key={point.key}
                  accessible
                  accessibilityLabel={point.accessibilityLabel}
                  className="items-center"
                  style={{ width: columnWidth }}
                >
                  <View
                    className="w-full items-center justify-end"
                    style={{ height: maxBarHeight }}
                  >
                    {display.type === "message" ? (
                      <Text
                        maxFontSizeMultiplier={1.5}
                        adjustsFontSizeToFit
                        numberOfLines={2}
                        className="text-muted px-1 pb-1 text-center text-xs font-semibold"
                        style={{ width: columnWidth }}
                      >
                        {display.label}
                      </Text>
                    ) : display.type === "bar" && tone ? (
                      <View
                        className={point.faded ? "opacity-70" : undefined}
                        style={{ width: barWidth, height: barHeight }}
                      >
                        {segments
                          .map((segment, index) => ({
                            segment,
                            height: heights[index] ?? 0,
                            index,
                          }))
                          .reverse()
                          .map(({ segment, height, index }, order) => {
                            const classes = toneClasses[segment.tone];
                            return (
                              <View
                                key={`${point.key}-segment-${index}`}
                                className={`${segment.outline ? `${classes.border} border-2 ${segment.outline === "dotted" ? "border-dotted" : "border-solid"}` : classes.container} items-center justify-end px-0.5 pb-0.5 ${order === 0 ? "rounded-t" : ""}`}
                                style={{ width: barWidth, height }}
                              >
                                {segment.lines.map((line, lineIndex) => (
                                  <Text
                                    key={`${point.key}-${index}-${lineIndex}`}
                                    maxFontSizeMultiplier={1}
                                    adjustsFontSizeToFit
                                    numberOfLines={1}
                                    className={`${segment.outline ? classes.outlinedText : classes.text} text-[10px] ${line.strong ? "font-bold" : "font-semibold"} ${line.tabularNumbers === false ? "" : "tabular-nums"}`}
                                  >
                                    {line.text}
                                  </Text>
                                ))}
                              </View>
                            );
                          })}
                      </View>
                    ) : display.type === "empty" ? (
                      <View
                        className="border-border h-11 items-center justify-center rounded-t border"
                        style={{ width: barWidth }}
                      >
                        <Text
                          maxFontSizeMultiplier={1}
                          numberOfLines={1}
                          className="text-muted text-[10px] font-semibold tabular-nums"
                        >
                          {display.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    maxFontSizeMultiplier={1.5}
                    numberOfLines={1}
                    className={
                      point.emphasized
                        ? "text-primary pt-2 text-sm font-bold tabular-nums"
                        : "text-foreground pt-2 text-sm font-semibold tabular-nums"
                    }
                    style={{ height: labelAxisHeight }}
                  >
                    {point.label}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </View>
      {!chartLoaded ? (
        <AnimatedViewStyled
          pointerEvents="none"
          exiting={FadeOut.duration(220)}
          className="bg-card absolute top-0 right-0 bottom-0 left-0"
        />
      ) : null}
    </View>
  );
}
