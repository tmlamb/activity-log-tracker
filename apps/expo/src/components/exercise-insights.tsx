import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { format } from "date-fns";

import type { ExerciseSetInsights } from "@activity-log/ui/utils";

import type { BarChartPoint } from "./BarChart";
import BarChart from "./BarChart";
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

function VolumeChart({
  insights,
  stack,
}: {
  insights: ExerciseSetInsights;
  stack: { index: number; size: number };
}) {
  const repOnlyValues = insights.points
    .filter(
      (point) => point.completed && point.reps > 0 && point.weightLbs <= 0,
    )
    .map((point) => point.reps);
  const maxRepOnlyReps = Math.max(...repOnlyValues, 1);
  const currentPointIndex = insights.points.findIndex((point) => point.current);
  const initialScrollIndex = Math.max(currentPointIndex - 4, 0);
  const setLabel = `${insights.setType} Set ${insights.setNumber}`;
  const chartPoints: BarChartPoint[] = insights.points.map((point) => {
    const repOnly = point.completed && point.reps > 0 && point.weightLbs <= 0;
    const dateLabel = point.date ? format(point.date, "M/d") : "--";
    const accessibilityLabel = point.notStarted
      ? `${dateLabel}, current session, not started`
      : repOnly
        ? `${dateLabel}${point.current ? ", current session" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps, no recorded weight`
        : `${dateLabel}${point.current ? ", current session" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps at ${numberFormatter.format(point.weightLbs)} pounds, ${numberFormatter.format(point.volumeLbs)} pounds of volume`;
    const tone =
      point.feedback === "Easy"
        ? "info"
        : point.feedback === "Hard"
          ? "primary"
          : "muted";
    const display: BarChartPoint["display"] = point.notStarted
      ? { type: "message", label: "Not Started" }
      : repOnly
        ? {
            type: "bar",
            tone,
            heightRatio: point.reps / maxRepOnlyReps,
            minimumHeight: 24,
            lines: [
              {
                text: `${numberFormatter.format(point.reps)} reps`,
                strong: true,
              },
            ],
          }
        : point.volumeLbs > 0
          ? {
              type: "bar",
              tone,
              lines: [
                {
                  text: `${numberFormatter.format(point.reps)} reps`,
                  strong: true,
                },
                {
                  text: `${numberFormatter.format(point.weightLbs)} lbs`,
                },
                ...(point.feedback === "Easy" || point.feedback === "Hard"
                  ? [
                      {
                        text: point.feedback,
                        tabularNumbers: false,
                      },
                    ]
                  : []),
              ],
            }
          : { type: "empty", label: "0 reps" };

    return {
      key: point.sessionId,
      value: point.notStarted ? 0 : point.volumeLbs,
      label: dateLabel,
      accessibilityLabel,
      emphasized: point.current,
      faded: !point.current,
      display,
    };
  });

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

      <BarChart
        valueAxisLabel="VOLUME (LBS)"
        points={chartPoints}
        initialScrollIndex={initialScrollIndex}
      />
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
  const currentSetType = insights.find(
    (setInsights) => setInsights.selected,
  )?.setType;
  const warmupSetInsights = insights.filter(
    (setInsights) => setInsights.setType === "Warmup",
  );
  const mainSetInsights = insights.filter(
    (setInsights) => setInsights.setType === "Main",
  );
  const [warmupSetsCollapsed, setWarmupSetsCollapsed] = useState(
    currentSetType === "Main",
  );
  const [mainSetsCollapsed, setMainSetsCollapsed] = useState(
    currentSetType === "Warmup",
  );
  const collapsibleSectionScroll = useCollapsibleSectionScroll();

  const toggleWarmupSets = () => {
    collapsibleSectionScroll.prepareSectionToggle();
    setWarmupSetsCollapsed((collapsed) => !collapsed);
  };

  const toggleMainSets = () => {
    collapsibleSectionScroll.prepareSectionToggle();
    setMainSetsCollapsed((collapsed) => !collapsed);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pt-36 pb-18 gap-0"
      onLayout={collapsibleSectionScroll.onListLayout}
      onScroll={collapsibleSectionScroll.onScroll}
      scrollEventThrottle={16}
    >
      <View className="mb-3">
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
      {warmupSetInsights.length ? (
        <View>
          <CollapsibleSectionHeader
            title="Warmup Sets"
            collapsed={warmupSetsCollapsed}
            titleClassName="leading-tight"
            onPress={toggleWarmupSets}
          />
          <CollapsibleSectionBody collapsed={warmupSetsCollapsed}>
            <View>
              {warmupSetInsights.map((setInsights, index) => (
                <VolumeChart
                  key={`${setInsights.setType}-${setInsights.setNumber}`}
                  insights={setInsights}
                  stack={{ index, size: warmupSetInsights.length }}
                />
              ))}
            </View>
          </CollapsibleSectionBody>
        </View>
      ) : null}
      <View>
        <CollapsibleSectionHeader
          title="Main Sets"
          collapsed={mainSetsCollapsed}
          titleClassName="leading-tight"
          onPress={toggleMainSets}
        />
        <CollapsibleSectionBody collapsed={mainSetsCollapsed}>
          <View>
            {mainSetInsights.map((setInsights, index) => (
              <VolumeChart
                key={`${setInsights.setType}-${setInsights.setNumber}`}
                insights={setInsights}
                stack={{ index, size: mainSetInsights.length }}
              />
            ))}
          </View>
        </CollapsibleSectionBody>
      </View>
    </ScrollView>
  );
}
