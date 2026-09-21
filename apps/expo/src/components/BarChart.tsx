import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { FadeOut } from "react-native-reanimated";

import { getBarChartTickValues } from "./bar-chart-axis";
import { AnimatedViewStyled, LegendListStyled } from "./Styled";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export const formatBarChartValue = (value: number) => {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return numberFormatter.format(value);
};

export type BarChartTone = "primary" | "info" | "muted";

export interface BarChartLine {
  text: string;
  strong?: boolean;
  tabularNumbers?: boolean;
}

export type BarChartDisplay =
  | {
      type: "bar";
      lines: BarChartLine[];
      tone?: BarChartTone;
      heightRatio?: number;
      minimumHeight?: number;
      dotted?: boolean;
      pending?: {
        value: number;
        lines: BarChartLine[];
      };
    }
  | { type: "empty"; label: string }
  | { type: "message"; label: string };

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
              const dotted = display.type === "bar" && display.dotted;
              const pending =
                display.type === "bar" && display.pending?.value
                  ? display.pending
                  : undefined;
              const pendingValue = Math.min(
                Math.max(pending?.value ?? 0, 0),
                Math.max(point.value, 0),
              );
              const completedValue = Math.max(point.value - pendingValue, 0);
              const barHeight =
                display.type === "bar"
                  ? Math.max(
                      (display.heightRatio ?? point.value / maxValue) *
                        maxBarHeight,
                      display.minimumHeight ?? 58,
                    )
                  : 0;
              const minimumSegmentHeight = Math.min(18, barHeight / 2);
              const pendingHeight = pendingValue
                ? completedValue > 0
                  ? Math.min(
                      Math.max(
                        (pendingValue / point.value) * barHeight,
                        minimumSegmentHeight,
                      ),
                      barHeight - minimumSegmentHeight,
                    )
                  : barHeight
                : 0;
              const completedHeight = barHeight - pendingHeight;
              const barClassName = tone
                ? `${dotted ? `${toneClasses[tone].border} border-2 border-dotted` : toneClasses[tone].container} items-center justify-end rounded-t px-0.5 pb-0.5`
                : "";
              const pendingClassName = tone
                ? `${toneClasses[tone].border} items-center justify-end rounded-t border-2 border-dotted px-0.5 pb-0.5`
                : "";
              const completedClassName = tone
                ? `${toneClasses[tone].container} items-center justify-end px-0.5 pb-0.5`
                : "";

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
                        {pendingValue && pending ? (
                          <>
                            <View
                              className={pendingClassName}
                              style={{
                                width: barWidth,
                                height: pendingHeight,
                              }}
                            >
                              {pending.lines.map((line, index) => (
                                <Text
                                  key={`${point.key}-pending-${index}`}
                                  maxFontSizeMultiplier={1}
                                  adjustsFontSizeToFit
                                  numberOfLines={1}
                                  className={`${toneClasses[tone].outlinedText} text-[10px] ${line.strong ? "font-bold" : "font-semibold"} ${line.tabularNumbers === false ? "" : "tabular-nums"}`}
                                >
                                  {line.text}
                                </Text>
                              ))}
                            </View>
                            {completedValue > 0 ? (
                              <View
                                className={completedClassName}
                                style={{
                                  width: barWidth,
                                  height: completedHeight,
                                }}
                              >
                                {display.lines.map((line, index) => (
                                  <Text
                                    key={`${point.key}-completed-${index}`}
                                    maxFontSizeMultiplier={1}
                                    adjustsFontSizeToFit
                                    numberOfLines={1}
                                    className={`${toneClasses[tone].text} text-[10px] ${line.strong ? "font-bold" : "font-semibold"} ${line.tabularNumbers === false ? "" : "tabular-nums"}`}
                                  >
                                    {line.text}
                                  </Text>
                                ))}
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <View
                            className={barClassName}
                            style={{ width: barWidth, height: barHeight }}
                          >
                            {display.lines.map((line, index) => (
                              <Text
                                key={`${point.key}-${index}`}
                                maxFontSizeMultiplier={1}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                className={`${dotted ? toneClasses[tone].outlinedText : toneClasses[tone].text} text-[10px] ${line.strong ? "font-bold" : "font-semibold"} ${line.tabularNumbers === false ? "" : "tabular-nums"}`}
                              >
                                {line.text}
                              </Text>
                            ))}
                          </View>
                        )}
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
