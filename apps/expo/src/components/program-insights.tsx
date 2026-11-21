import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import type { ProgramInsightMetrics } from "@activity-log/ui/utils";

import type { BarChartLine, BarChartPoint } from "./BarChart";
import type { ProgramInsightsView as ProgramInsightsData } from "~/data/insight-presenters";
import BarChart, { formatBarChartValue } from "./BarChart";
import Card from "./Card";
import { DetailCardRow } from "./CardRow";
import { Text } from "./font-scale-text";
import PressableThemed from "./PressableThemed";
import { HelperText } from "./Typography";

type MetricKey = keyof ProgramInsightMetrics;

interface MetricOption {
  key: MetricKey;
  label: string;
  valueLabel: string;
  axisLabel: string;
}

const defaultMetricOption: MetricOption = {
  key: "sets",
  label: "Sets",
  valueLabel: "sets",
  axisLabel: "SETS",
};

const metricOptions: MetricOption[] = [
  defaultMetricOption,
  { key: "reps", label: "Reps", valueLabel: "reps", axisLabel: "REPS" },
  {
    key: "volumeLbs",
    label: "Volume",
    valueLabel: "pounds moved",
    axisLabel: "VOLUME (LBS)",
  },
  {
    key: "hardSets",
    label: "Hard",
    valueLabel: "hard sets",
    axisLabel: "HARD SETS",
  },
  {
    key: "easySets",
    label: "Easy",
    valueLabel: "easy sets",
    axisLabel: "EASY SETS",
  },
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const formatMetricValue = (value: number) => numberFormatter.format(value);

/** A drop set segment's lines: its value, then "Drop". */
const dropLines = (value: number): BarChartLine[] => [
  { text: formatBarChartValue(value), strong: true },
  { text: "Drop", tabularNumbers: false },
];
/** Room for both of a drop set segment's lines. */
const DROP_SEGMENT_HEIGHT = 30;

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

function TrendChart({ insights }: { insights: ProgramInsightsData }) {
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
  const chartPoints: BarChartPoint[] = insights.weeks.map((week, index) => {
    const muscleMetrics = week.muscleGroups.find(
      (candidate) => candidate.muscleGroup === muscleGroup,
    );
    const completedValue = muscleMetrics?.[metric] ?? 0;
    const pendingValue = muscleMetrics?.pending[metric] ?? 0;
    const value = completedValue + pendingValue;
    const emphasized = index === insights.weeks.length - 1;
    // Drop sets count in the totals, and are shown muted on top of the bar.
    const dropValue = muscleMetrics?.drop[metric] ?? 0;
    const dropPendingValue = muscleMetrics?.dropPending[metric] ?? 0;
    const mainCompletedValue = Math.max(completedValue - dropValue, 0);
    const mainPendingValue = Math.max(pendingValue - dropPendingValue, 0);
    const dropSummary =
      dropValue + dropPendingValue > 0
        ? `, including drop sets: ${formatMetricValue(dropValue)} completed${dropPendingValue > 0 ? ` and ${formatMetricValue(dropPendingValue)} pending` : ""} ${metricOption.valueLabel}`
        : "";

    return {
      key: String(week.week),
      value,
      label: `W${week.week}`,
      accessibilityLabel:
        pendingValue > 0
          ? `Week ${week.week}, ${muscleGroup}, ${formatMetricValue(completedValue)} completed ${metricOption.valueLabel}, ${formatMetricValue(pendingValue)} pending ${metricOption.valueLabel}, ${formatMetricValue(value)} projected total ${metricOption.valueLabel}${dropSummary}`
          : `Week ${week.week}, ${muscleGroup}, ${formatMetricValue(value)} ${metricOption.valueLabel}${dropSummary}`,
      emphasized,
      faded: !emphasized,
      display:
        value > 0
          ? {
              type: "bar",
              tone: "primary",
              lines:
                mainCompletedValue > 0
                  ? [
                      {
                        text: formatBarChartValue(mainCompletedValue),
                        strong: true,
                      },
                    ]
                  : [],
              ...(mainPendingValue > 0
                ? {
                    pending: {
                      value: mainPendingValue,
                      lines: [
                        {
                          text: formatBarChartValue(mainPendingValue),
                          strong: true,
                        },
                      ],
                    },
                  }
                : {}),
              segments: [
                {
                  value: dropValue,
                  tone: "muted",
                  lines: dropLines(dropValue),
                  minimumHeight: DROP_SEGMENT_HEIGHT,
                },
                {
                  value: dropPendingValue,
                  tone: "muted",
                  dotted: true,
                  lines: dropLines(dropPendingValue),
                  minimumHeight: DROP_SEGMENT_HEIGHT,
                },
              ],
            }
          : { type: "empty", label: "0" },
    };
  });

  return (
    <Card
      variants={["multiline"]}
      className="mt-8 h-auto flex-col items-stretch gap-5 py-5"
    >
      <Text
        selectable
        maxFontSizeMultiplier={2.5}
        className="text-foreground text-xl font-semibold"
      >
        Weekly Trends
      </Text>

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

      <Animated.View
        key={`${muscleGroup}-${metric}`}
        entering={FadeIn.duration(180)}
      >
        <BarChart
          valueAxisLabel={metricOption.axisLabel}
          points={chartPoints}
          initialScrollIndex={Math.max(insights.weeks.length - 5, 0)}
        />
      </Animated.View>
    </Card>
  );
}

export default function ProgramInsights({
  programName,
  insights,
  partial = false,
}: {
  programName: string;
  insights: ProgramInsightsData;
  partial?: boolean;
}) {
  const hasTrendData = insights.muscleGroups.length > 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pt-5 pb-18"
      contentInsetAdjustmentBehavior="automatic"
    >
      <DetailCardRow
        label="Program"
        value={programName}
        cardVariants={["multiline"]}
      />
      {partial && (
        <HelperText accessibilityRole="summary">
          Some results are partial because recovered workout details are
          unavailable.
        </HelperText>
      )}

      {hasTrendData ? (
        <TrendChart insights={insights} />
      ) : (
        <Card
          variants={["multiline"]}
          className="mt-8 h-auto flex-col items-stretch gap-5 py-5"
        >
          <Text
            selectable
            maxFontSizeMultiplier={2.5}
            className="text-foreground text-xl font-semibold"
          >
            Weekly Trends
          </Text>
          <Text
            selectable
            maxFontSizeMultiplier={2.5}
            className="text-muted text-lg leading-tight"
          >
            Complete a main set for an exercise with an assigned muscle group to
            start seeing insights.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}
