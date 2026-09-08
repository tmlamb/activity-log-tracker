import {
  FlatList,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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
  const maxBarHeight = 128;
  const dateAxisHeight = 32;
  const currentPointIndex = insights.points.findIndex((point) => point.current);
  const initialScrollIndex = Math.max(currentPointIndex - 4, 0);
  const columnWidth = plotWidth / 5;
  const barWidth = Math.min(58, Math.max(columnWidth - 10, 34));

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
          Progression of total volume (reps x weight) for this set over time.
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

          <View
            className="relative overflow-hidden"
            style={{ width: plotWidth }}
          >
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
              data={insights.points}
              horizontal
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialScrollIndex}
              initialNumToRender={7}
              maxToRenderPerBatch={10}
              windowSize={5}
              style={{ width: plotWidth }}
              contentContainerClassName="items-end"
              keyExtractor={(point) => point.sessionId}
              getItemLayout={(_, index) => ({
                length: columnWidth,
                offset: columnWidth * index,
                index,
              })}
              renderItem={({ item: point }) => {
                const barHeight =
                  point.volumeLbs > 0
                    ? Math.max((point.volumeLbs / maxValue) * maxBarHeight, 58)
                    : 0;
                const dateLabel = point.date ? format(point.date, "M/d") : "--";
                const feedbackTone =
                  point.feedback === "Easy"
                    ? {
                        container: "bg-info",
                        text: "text-info-foreground",
                      }
                    : point.feedback === "Hard"
                      ? {
                          container: "bg-primary",
                          text: "text-primary-foreground",
                        }
                      : {
                          container: "bg-muted",
                          text: "text-muted-foreground",
                        };

                return (
                  <View
                    key={point.sessionId}
                    accessible
                    accessibilityLabel={`${dateLabel}${point.current ? ", current set" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps at ${numberFormatter.format(point.weightLbs)} pounds, ${numberFormatter.format(point.volumeLbs)} pounds of volume`}
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
                              ? `${feedbackTone.container} items-center justify-center rounded-t px-0.5`
                              : `${feedbackTone.container} items-center justify-center rounded-t px-0.5 opacity-70`
                          }
                          style={{ width: barWidth, height: barHeight }}
                        >
                          <Text
                            maxFontSizeMultiplier={1}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            className={`${feedbackTone.text} text-[10px] font-bold tabular-nums`}
                          >
                            {numberFormatter.format(point.reps)} reps
                          </Text>
                          <Text
                            maxFontSizeMultiplier={1}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            className={`${feedbackTone.text} text-[10px] font-semibold tabular-nums`}
                          >
                            {numberFormatter.format(point.weightLbs)} lbs
                          </Text>
                          {point.feedback === "Easy" ||
                          point.feedback === "Hard" ? (
                            <Text
                              maxFontSizeMultiplier={1}
                              adjustsFontSizeToFit
                              numberOfLines={1}
                              className={`${feedbackTone.text} text-[10px] font-semibold`}
                            >
                              {point.feedback}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <View
                          className="border-border h-11 items-center justify-center rounded-t border"
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
              }}
            />
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
