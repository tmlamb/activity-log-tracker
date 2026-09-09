import { FlatList, Text, useWindowDimensions, View } from "react-native";

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
  points: readonly BarChartPoint[];
  initialScrollIndex?: number;
}

const toneClasses: Record<BarChartTone, { container: string; text: string }> = {
  primary: {
    container: "bg-primary",
    text: "text-primary-foreground",
  },
  info: {
    container: "bg-info",
    text: "text-info-foreground",
  },
  muted: {
    container: "bg-muted",
    text: "text-muted-foreground",
  },
};

export default function BarChart({
  valueAxisLabel,
  points,
  initialScrollIndex = 0,
}: BarChartProps) {
  const { width } = useWindowDimensions();
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = Math.max(width - 80, 240);
  const yAxisWidth = 42;
  const plotWidth = chartWidth - yAxisWidth;
  const maxBarHeight = 128;
  const labelAxisHeight = 32;
  const columnWidth = plotWidth / 5;
  const barWidth = Math.min(58, Math.max(columnWidth - 10, 34));
  const boundedInitialScrollIndex = points.length
    ? Math.min(Math.max(initialScrollIndex, 0), points.length - 1)
    : undefined;

  return (
    <View style={{ width: chartWidth }}>
      <Text maxFontSizeMultiplier={1.5} className="text-muted mb-1 font-medium">
        {valueAxisLabel}
      </Text>
      <View className="flex-row">
        <View style={{ width: yAxisWidth }}>
          <View className="justify-between" style={{ height: maxBarHeight }}>
            {[maxValue, maxValue / 2, 0].map((value) => (
              <Text
                key={value}
                maxFontSizeMultiplier={1.5}
                numberOfLines={1}
                className="text-muted pr-2 text-right text-xs tabular-nums"
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
            className="absolute top-0 right-0 left-0 justify-between"
            style={{ height: maxBarHeight }}
          >
            <View className="border-border border-t" />
            <View className="border-border border-t" />
            <View className="border-border border-t" />
          </View>

          <FlatList
            data={points}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={boundedInitialScrollIndex}
            initialNumToRender={7}
            maxToRenderPerBatch={10}
            windowSize={5}
            style={{ width: plotWidth }}
            contentContainerClassName="items-end"
            keyExtractor={(point) => point.key}
            getItemLayout={(_, index) => ({
              length: columnWidth,
              offset: columnWidth * index,
              index,
            })}
            renderItem={({ item: point }) => {
              const { display } = point;
              const tone =
                display.type === "bar" ? (display.tone ?? "primary") : null;
              const barHeight =
                display.type === "bar"
                  ? Math.max(
                      (display.heightRatio ?? point.value / maxValue) *
                        maxBarHeight,
                      display.minimumHeight ?? 58,
                    )
                  : 0;
              const barClassName = tone
                ? `${toneClasses[tone].container} items-center justify-center rounded-t px-0.5${point.faded ? " opacity-70" : ""}`
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
                        className={barClassName}
                        style={{ width: barWidth, height: barHeight }}
                      >
                        {display.lines.map((line, index) => (
                          <Text
                            key={`${point.key}-${index}`}
                            maxFontSizeMultiplier={1}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            className={`${toneClasses[tone].text} text-[10px] ${line.strong ? "font-bold" : "font-semibold"} ${line.tabularNumbers === false ? "" : "tabular-nums"}`}
                          >
                            {line.text}
                          </Text>
                        ))}
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
    </View>
  );
}
