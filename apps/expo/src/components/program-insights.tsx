import { useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { format, isSameMonth } from "date-fns";

import type {
  ProgramInsightMetrics,
  ProgramInsights as ProgramInsightsData,
  ProgramInsightWeek,
} from "@activity-log/ui/utils";

import Card from "./Card";
import { DetailCardRow } from "./CardRow";
import PressableThemed from "./PressableThemed";
import { HelperText, ScreenHeading, SectionHeading } from "./Typography";

type MetricKey = keyof ProgramInsightMetrics;

interface MetricOption {
  key: MetricKey;
  label: string;
  valueLabel: string;
}

const defaultMetricOption: MetricOption = {
  key: "sets",
  label: "Sets",
  valueLabel: "sets",
};

const metricOptions: MetricOption[] = [
  defaultMetricOption,
  { key: "reps", label: "Reps", valueLabel: "reps" },
  { key: "volumeLbs", label: "Volume", valueLabel: "pounds moved" },
  { key: "hardSets", label: "Hard", valueLabel: "hard sets" },
  { key: "easySets", label: "Easy", valueLabel: "easy sets" },
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const formatMetricValue = (value: number) => numberFormatter.format(value);

const formatChartValue = (value: number) => {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return numberFormatter.format(value);
};

function ChoicePills<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <PressableThemed
              key={option.value}
              className={
                selected
                  ? "bg-primary min-h-12 justify-center rounded-full px-4 py-2"
                  : "bg-background min-h-12 justify-center rounded-full px-4 py-2"
              }
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
            >
              <Text
                maxFontSizeMultiplier={2}
                className={
                  selected
                    ? "text-primary-foreground text-base font-semibold"
                    : "text-foreground text-base font-semibold"
                }
              >
                {option.label}
              </Text>
            </PressableThemed>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 gap-0.5 pr-2 pb-3">
      <Text maxFontSizeMultiplier={2} className="text-muted text-sm">
        {label}
      </Text>
      <Text
        selectable
        maxFontSizeMultiplier={2}
        className="text-foreground text-lg font-semibold tabular-nums"
      >
        {value}
      </Text>
    </View>
  );
}

function TrendChart({ insights }: { insights: ProgramInsightsData }) {
  const { width } = useWindowDimensions();
  const chartListRef = useRef<FlatList<ProgramInsightWeek>>(null);
  const [metric, setMetric] = useState<MetricKey>("sets");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(
    insights.muscleGroups[0] ?? "",
  );
  const muscleGroup = insights.muscleGroups.includes(selectedMuscleGroup)
    ? selectedMuscleGroup
    : (insights.muscleGroups[0] ?? "");
  const metricOption =
    metricOptions.find((option) => option.key === metric) ??
    defaultMetricOption;
  const values = insights.weeks.map((week) => {
    const muscleMetrics = week.muscleGroups.find(
      (candidate) => candidate.muscleGroup === muscleGroup,
    );
    return muscleMetrics?.[metric] ?? 0;
  });
  const maxValue = Math.max(...values, 1);
  const chartViewportWidth = Math.max(width - 80, 62);
  const chartColumnWidth = Math.max(
    chartViewportWidth / insights.weeks.length,
    62,
  );

  return (
    <Card
      variants={["multiline"]}
      className="h-auto flex-col items-stretch gap-5 py-5"
    >
      <View className="gap-2">
        <Text
          maxFontSizeMultiplier={2}
          className="text-muted text-sm font-medium"
        >
          METRIC
        </Text>
        <ChoicePills
          accessibilityLabel="Trend metric"
          options={metricOptions.map((option) => ({
            label: option.label,
            value: option.key,
          }))}
          value={metric}
          onChange={setMetric}
        />
      </View>

      <View className="gap-2">
        <Text
          maxFontSizeMultiplier={2}
          className="text-muted text-sm font-medium"
        >
          MUSCLE GROUP
        </Text>
        <ChoicePills
          accessibilityLabel="Trend muscle group"
          options={insights.muscleGroups.map((name) => ({
            label: name,
            value: name,
          }))}
          value={muscleGroup}
          onChange={setSelectedMuscleGroup}
        />
      </View>

      <View className="gap-1">
        <Text
          selectable
          maxFontSizeMultiplier={2.5}
          className="text-foreground text-xl font-semibold"
        >
          {muscleGroup} {metricOption.label}
          {metric === "volumeLbs" ? " (lb)" : ""}
        </Text>
        <Text maxFontSizeMultiplier={2} className="text-muted text-sm">
          Completed main sets by program week
        </Text>
      </View>

      <Animated.View
        key={`${muscleGroup}-${metric}`}
        entering={FadeIn.duration(180)}
        className="h-48"
      >
        <FlatList
          ref={chartListRef}
          data={insights.weeks}
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={8}
          initialScrollIndex={Math.max(insights.weeks.length - 1, 0)}
          maxToRenderPerBatch={12}
          windowSize={5}
          extraData={`${muscleGroup}-${metric}`}
          contentContainerClassName="items-end"
          style={{ width: chartViewportWidth }}
          keyExtractor={(week) => String(week.week)}
          getItemLayout={(_, index) => ({
            length: chartColumnWidth,
            offset: chartColumnWidth * index,
            index,
          })}
          onContentSizeChange={() =>
            chartListRef.current?.scrollToEnd({ animated: false })
          }
          onLayout={() =>
            chartListRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item: week, index }) => {
            const value = values[index] ?? 0;
            const barHeight =
              value > 0 ? Math.max((value / maxValue) * 116, 4) : 0;

            return (
              <View
                key={week.week}
                accessible
                accessibilityLabel={`Week ${week.week}, ${muscleGroup}, ${formatMetricValue(value)} ${metricOption.valueLabel}`}
                className="items-center gap-1.5"
                style={{ width: chartColumnWidth }}
              >
                <Text
                  selectable
                  maxFontSizeMultiplier={1.5}
                  numberOfLines={1}
                  className="text-muted w-15 text-center text-xs tabular-nums"
                >
                  {formatChartValue(value)}
                </Text>
                <View className="bg-background h-29 w-4 justify-end overflow-hidden rounded-full">
                  <View
                    className="bg-primary w-full rounded-full"
                    style={{ height: barHeight }}
                  />
                </View>
                <Text
                  maxFontSizeMultiplier={1.5}
                  className="text-foreground text-sm font-semibold tabular-nums"
                >
                  W{week.week}
                </Text>
              </View>
            );
          }}
        />
      </Animated.View>
    </Card>
  );
}

function weekDateRange(start: Date, end: Date) {
  return isSameMonth(start, end)
    ? `${format(start, "MMM d")}-${format(end, "d")}`
    : `${format(start, "MMM d")}-${format(end, "MMM d")}`;
}

function WeekInsights({
  week,
  isFirst,
}: {
  week: ProgramInsightWeek;
  isFirst: boolean;
}) {
  return (
    <View className={isFirst ? undefined : "pt-5"}>
      <SectionHeading placement="flush">
        Week {week.week}: {weekDateRange(week.start, week.end)}
      </SectionHeading>
      {week.muscleGroups.length ? (
        week.muscleGroups.map((muscleGroup, index) => (
          <Card
            key={muscleGroup.muscleGroup}
            stack={{ index, size: week.muscleGroups.length }}
            variants={["multiline"]}
            className="h-auto flex-col items-stretch gap-3 py-4"
            accessible
            accessibilityLabel={`${muscleGroup.muscleGroup}: ${muscleGroup.sets} sets, ${muscleGroup.reps} reps, ${numberFormatter.format(muscleGroup.volumeLbs)} pounds moved, ${muscleGroup.hardSets} hard sets, ${muscleGroup.easySets} easy sets`}
          >
            <View className="flex-row items-baseline justify-between gap-3">
              <Text
                selectable
                maxFontSizeMultiplier={2.5}
                className="text-foreground flex-1 text-xl font-semibold"
              >
                {muscleGroup.muscleGroup}
              </Text>
              <Text
                selectable
                maxFontSizeMultiplier={2}
                className="text-primary text-lg font-semibold tabular-nums"
              >
                {muscleGroup.sets} {muscleGroup.sets === 1 ? "set" : "sets"}
              </Text>
            </View>
            <View className="flex-row flex-wrap pb-1">
              <MetricStat
                label="Reps"
                value={numberFormatter.format(muscleGroup.reps)}
              />
              <MetricStat
                label="Weight moved"
                value={`${numberFormatter.format(muscleGroup.volumeLbs)} lb`}
              />
              <MetricStat
                label="Hard sets"
                value={numberFormatter.format(muscleGroup.hardSets)}
              />
              <MetricStat
                label="Easy sets"
                value={numberFormatter.format(muscleGroup.easySets)}
              />
            </View>
          </Card>
        ))
      ) : (
        <Card variants={["multiline"]} className="h-auto py-5">
          <Text
            selectable
            maxFontSizeMultiplier={2.5}
            className="text-muted text-lg"
          >
            No completed main sets
          </Text>
        </Card>
      )}
    </View>
  );
}

export default function ProgramInsights({
  programName,
  insights,
}: {
  programName: string;
  insights: ProgramInsightsData;
}) {
  const hasTrendData = insights.muscleGroups.length > 0;
  const hasProgramWeeks = insights.weeks.length > 0;
  const weeksNewestFirst = [...insights.weeks].reverse();

  return (
    <FlatList
      data={weeksNewestFirst}
      keyExtractor={(week) => String(week.week)}
      contentContainerClassName="px-5 pt-36 pb-18"
      initialNumToRender={4}
      windowSize={7}
      ListHeaderComponent={
        <>
          <DetailCardRow
            label="Program"
            value={programName}
            cardVariants={["multiline"]}
          />

          <ScreenHeading className="mb-2">Weekly Trends</ScreenHeading>
          {hasTrendData ? (
            <TrendChart insights={insights} />
          ) : (
            <Card variants={["multiline"]} className="h-auto py-5">
              <Text
                selectable
                maxFontSizeMultiplier={2.5}
                className="text-muted text-lg leading-tight"
              >
                Complete a main set for an exercise with an assigned muscle
                group to start seeing insights.
              </Text>
            </Card>
          )}

          {hasProgramWeeks ? (
            <ScreenHeading className="mb-2">Week by Week</ScreenHeading>
          ) : null}
        </>
      }
      renderItem={({ item, index }) => (
        <WeekInsights week={item} isFirst={index === 0} />
      )}
      ListFooterComponent={
        hasTrendData ? (
          <HelperText
            selectable
            placement="blockStart"
            className="mx-0 mt-8 leading-tight"
          >
            Completed main sets with recorded reps are counted. Current exercise
            settings determine muscle groups and paired weights. Each primary
            muscle receives full credit; unassigned exercises are excluded, and
            kg values are converted to lb.
          </HelperText>
        ) : null
      }
    />
  );
}
