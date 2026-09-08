import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { format } from "date-fns";

import type { ExerciseSetInsights } from "@activity-log/ui/utils";

import Card from "./Card";
import { DetailCardRow } from "./CardRow";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const formatChartValue = (value: number) => {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return numberFormatter.format(value);
};

function VolumeChart({ insights }: { insights: ExerciseSetInsights }) {
  const { width } = useWindowDimensions();
  const values = insights.points.map((point) => point.volumeLbs);
  const maxValue = Math.max(...values, 1);
  const chartWidth = Math.max(width - 80, 240);
  const yAxisWidth = 42;
  const plotWidth = chartWidth - yAxisWidth;
  const columnWidth = plotWidth / Math.max(insights.points.length, 1);
  const barWidth = Math.min(58, Math.max(columnWidth - 10, 34));
  const maxBarHeight = 128;
  const dateAxisHeight = 32;

  return (
    <Card
      variants={["multiline"]}
      className="h-auto flex-col items-stretch gap-5 py-5"
    >
      <View className="gap-1">
        <Text
          selectable
          maxFontSizeMultiplier={2.5}
          className="text-foreground text-xl font-semibold"
        >
          Volume History
        </Text>
        <Text maxFontSizeMultiplier={2} className="text-muted text-sm">
          Reps x weight for this set position
        </Text>
      </View>

      <View style={{ width: chartWidth }}>
        <Text
          maxFontSizeMultiplier={1.5}
          className="text-muted mb-1 text-xs font-medium"
        >
          VOLUME (LBS)
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
                  {formatChartValue(value)}
                </Text>
              ))}
            </View>
            <View style={{ height: dateAxisHeight }} />
          </View>

          <View className="relative" style={{ width: plotWidth }}>
            <View
              pointerEvents="none"
              className="absolute top-0 right-0 left-0 justify-between"
              style={{ height: maxBarHeight }}
            >
              <View className="border-border border-t" />
              <View className="border-border border-t" />
              <View className="border-border border-t" />
            </View>

            <View className="flex-row items-end">
              {insights.points.map((point) => {
                const barHeight =
                  point.volumeLbs > 0
                    ? Math.max((point.volumeLbs / maxValue) * maxBarHeight, 46)
                    : 0;
                const dateLabel = point.date ? format(point.date, "M/d") : "--";

                return (
                  <View
                    key={point.sessionId}
                    accessible
                    accessibilityLabel={`${dateLabel}${point.current ? ", current set" : ""}, ${numberFormatter.format(point.reps)} reps at ${numberFormatter.format(point.weightLbs)} pounds, ${numberFormatter.format(point.volumeLbs)} pounds of volume`}
                    className="items-center"
                    style={{ width: columnWidth }}
                  >
                    <View
                      className="w-full items-center justify-end"
                      style={{ height: maxBarHeight }}
                    >
                      {point.volumeLbs > 0 ? (
                        <View
                          className={
                            point.current
                              ? "bg-primary items-center justify-center rounded-t-xl px-0.5"
                              : "bg-primary items-center justify-center rounded-t-xl px-0.5 opacity-70"
                          }
                          style={{ width: barWidth, height: barHeight }}
                        >
                          <Text
                            maxFontSizeMultiplier={1}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            className="text-primary-foreground text-[10px] font-bold tabular-nums"
                          >
                            {numberFormatter.format(point.reps)} reps
                          </Text>
                          <Text
                            maxFontSizeMultiplier={1}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            className="text-primary-foreground text-[10px] font-semibold tabular-nums"
                          >
                            {numberFormatter.format(point.weightLbs)} lbs
                          </Text>
                        </View>
                      ) : (
                        <View
                          className="border-border h-11 items-center justify-center rounded-t-xl border"
                          style={{ width: barWidth }}
                        >
                          <Text
                            maxFontSizeMultiplier={1}
                            numberOfLines={1}
                            className="text-muted text-[10px] font-semibold tabular-nums"
                          >
                            0 reps
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      maxFontSizeMultiplier={1.5}
                      numberOfLines={1}
                      className={
                        point.current
                          ? "text-primary pt-2 text-sm font-bold tabular-nums"
                          : "text-foreground pt-2 text-sm font-semibold tabular-nums"
                      }
                      style={{ height: dateAxisHeight }}
                    >
                      {dateLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function ExerciseInsights({
  exerciseName,
  sessionName,
  insights,
}: {
  exerciseName: string;
  sessionName: string;
  insights: ExerciseSetInsights;
}) {
  const setLabel = `${insights.setType} Set ${insights.setNumber}`;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pt-36 pb-18 gap-10"
    >
      <View>
        <DetailCardRow
          label="Exercise"
          value={exerciseName}
          cardVariants={["multiline"]}
          stack={{ index: 0, size: 3 }}
        />
        <DetailCardRow
          label="Set"
          value={setLabel}
          stack={{ index: 1, size: 3 }}
        />
        <DetailCardRow
          label="Session"
          value={sessionName}
          cardVariants={["multiline"]}
          stack={{ index: 2, size: 3 }}
        />
      </View>
      <VolumeChart insights={insights} />
    </ScrollView>
  );
}
