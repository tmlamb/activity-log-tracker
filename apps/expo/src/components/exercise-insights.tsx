import { useState } from "react";
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
import {
  CollapsibleSectionBody,
  CollapsibleSectionHeader,
  useCollapsibleSectionScroll,
} from "./CollapsibleSection";
import { HelperText } from "./Typography";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const formatChartValue = (value: number) => {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return numberFormatter.format(value);
};

function VolumeChart({
  insights,
  stack,
}: {
  insights: ExerciseSetInsights;
  stack: { index: number; size: number };
}) {
  const { width } = useWindowDimensions();
  const volumeValues = insights.points
    .filter((point) => !point.notStarted)
    .map((point) => point.volumeLbs);
  const repOnlyValues = insights.points
    .filter(
      (point) => point.completed && point.reps > 0 && point.weightLbs <= 0,
    )
    .map((point) => point.reps);
  const maxValue = Math.max(...volumeValues, 1);
  const maxRepOnlyReps = Math.max(...repOnlyValues, 1);
  const chartWidth = Math.max(width - 80, 240);
  const yAxisWidth = 42;
  const plotWidth = chartWidth - yAxisWidth;
  const maxBarHeight = 128;
  const dateAxisHeight = 32;
  const currentPointIndex = insights.points.findIndex((point) => point.current);
  const initialScrollIndex = Math.max(currentPointIndex - 4, 0);
  const columnWidth = plotWidth / 5;
  const barWidth = Math.min(58, Math.max(columnWidth - 10, 34));
  const setLabel = `${insights.setType} Set ${insights.setNumber}`;

  return (
    <Card
      stack={stack}
      variants={["multiline"]}
      className="h-auto flex-col items-stretch gap-5 py-5"
    >
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-1.5">
        <Text
          selectable
          maxFontSizeMultiplier={2.5}
          className="text-foreground text-xl font-semibold"
        >
          {setLabel}
        </Text>
        {insights.selected ? (
          <Text
            selectable
            maxFontSizeMultiplier={2}
            className="text-primary text-xl font-semibold"
          >
            Current
          </Text>
        ) : null}
      </View>

      <View style={{ width: chartWidth }}>
        <Text
          maxFontSizeMultiplier={1.5}
          className="text-muted mb-1 font-medium"
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
              nestedScrollEnabled
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
                const repOnly =
                  point.completed && point.reps > 0 && point.weightLbs <= 0;
                const barHeight = repOnly
                  ? Math.max((point.reps / maxRepOnlyReps) * maxBarHeight, 24)
                  : point.volumeLbs > 0
                    ? Math.max((point.volumeLbs / maxValue) * maxBarHeight, 58)
                    : 0;
                const dateLabel = point.date ? format(point.date, "M/d") : "--";
                const accessibilityLabel = point.notStarted
                  ? `${dateLabel}, current session, not started`
                  : repOnly
                    ? `${dateLabel}${point.current ? ", current session" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps, no recorded weight`
                    : `${dateLabel}${point.current ? ", current session" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps at ${numberFormatter.format(point.weightLbs)} pounds, ${numberFormatter.format(point.volumeLbs)} pounds of volume`;
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
                const barClassName = point.current
                  ? `${feedbackTone.container} items-center justify-center rounded-t px-0.5`
                  : `${feedbackTone.container} items-center justify-center rounded-t px-0.5 opacity-70`;

                return (
                  <View
                    key={point.sessionId}
                    accessible
                    accessibilityLabel={accessibilityLabel}
                    className="items-center"
                    style={{ width: columnWidth }}
                  >
                    <View
                      className="w-full items-center justify-end"
                      style={{ height: maxBarHeight }}
                    >
                      {point.notStarted ? (
                        <Text
                          maxFontSizeMultiplier={1.5}
                          adjustsFontSizeToFit
                          numberOfLines={2}
                          className="text-muted px-1 pb-1 text-center text-xs font-semibold"
                          style={{ width: columnWidth }}
                        >
                          Not Started
                        </Text>
                      ) : repOnly ? (
                        <View
                          className={barClassName}
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
                        </View>
                      ) : point.volumeLbs > 0 ? (
                        <View
                          className={barClassName}
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
  insights: ExerciseSetInsights[];
}) {
  const [volumeHistoryCollapsed, setVolumeHistoryCollapsed] = useState(false);
  const collapsibleSectionScroll = useCollapsibleSectionScroll();

  const toggleVolumeHistory = () => {
    collapsibleSectionScroll.prepareSectionToggle();
    setVolumeHistoryCollapsed((collapsed) => !collapsed);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pt-36 pb-18 gap-3"
      onLayout={collapsibleSectionScroll.onListLayout}
      onScroll={collapsibleSectionScroll.onScroll}
      scrollEventThrottle={16}
    >
      <View>
        <DetailCardRow
          label="Exercise"
          value={exerciseName}
          cardVariants={["multiline"]}
          stack={{ index: 0, size: 2 }}
        />
        <DetailCardRow
          label="Session"
          value={sessionName}
          cardVariants={["multiline"]}
          stack={{ index: 1, size: 2 }}
        />
      </View>
      <View>
        <CollapsibleSectionHeader
          title="Volume History"
          collapsed={volumeHistoryCollapsed}
          titleClassName="leading-tight"
          onPress={toggleVolumeHistory}
        />
        <CollapsibleSectionBody collapsed={volumeHistoryCollapsed}>
          <View>
            {insights.map((setInsights, index) => (
              <VolumeChart
                key={`${setInsights.setType}-${setInsights.setNumber}`}
                insights={setInsights}
                stack={{ index, size: insights.length }}
              />
            ))}
            <View>
              <HelperText className="mb-0 leading-tight">
                Progression of total volume per set over time.
              </HelperText>
              <HelperText className="mt-0 leading-tight">
                Volume = weight x reps
              </HelperText>
            </View>
          </View>
        </CollapsibleSectionBody>
      </View>
    </ScrollView>
  );
}
