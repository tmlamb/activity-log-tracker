import { useState } from "react";
import { ScrollView, View } from "react-native";
import { format } from "date-fns";

import type { BarChartPoint } from "./BarChart";
import type { ExerciseSetInsightsView as ExerciseSetInsights } from "~/data/insight-presenters";
import BarChart from "./BarChart";
import Card from "./Card";
import { DetailCardRow, NavigationCardRow } from "./CardRow";
import {
  CollapsibleSection,
  useCollapsibleSectionScroll,
} from "./CollapsibleSection";
import { Text } from "./font-scale-text";
import { HelperText } from "./Typography";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function VolumeChart({
  insights,
  stack,
  superset = false,
}: {
  insights: ExerciseSetInsights;
  stack: { index: number; size: number };
  superset?: boolean;
}) {
  const repOnlyValues = insights.points
    .filter(
      (point) => point.completed && point.reps > 0 && point.weightLbs <= 0,
    )
    .map((point) => point.reps);
  const hasWeightedBars = insights.points.some(
    (point) => point.volumeLbs > 0 || (point.notStarted && point.weightLbs > 0),
  );
  const usesRepsAxis = repOnlyValues.length > 0 && !hasWeightedBars;
  const maxRepOnlyReps = Math.max(...repOnlyValues, 1);
  const currentPointIndex = insights.points.findIndex((point) => point.current);
  const initialScrollIndex = Math.max(currentPointIndex - 4, 0);
  // Main sets done in a superset are named like on the session screen.
  const setLabel =
    superset && insights.setType === "Main"
      ? `Superset ${insights.setNumber}`
      : `${insights.setType} Set ${insights.setNumber}`;
  const chartPoints: BarChartPoint[] = insights.points.map((point) => {
    const repOnly = point.completed && point.reps > 0 && point.weightLbs <= 0;
    const hasPlannedWeight = point.notStarted && point.weightLbs > 0;
    const dateLabel = point.date ? format(point.date, "M/d") : "--";
    const accessibilityLabel = point.notStarted
      ? hasPlannedWeight
        ? `${dateLabel}, current session, not started, ${numberFormatter.format(point.reps)} planned reps at ${numberFormatter.format(point.weightLbs)} pounds, ${numberFormatter.format(point.volumeLbs)} pounds of planned volume`
        : `${dateLabel}, current session, not started`
      : repOnly
        ? `${dateLabel}${point.current ? ", current session" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps, no recorded weight`
        : `${dateLabel}${point.current ? ", current session" : ""}, ${point.feedback ?? "no difficulty"}, ${numberFormatter.format(point.reps)} reps at ${numberFormatter.format(point.weightLbs)} pounds, ${numberFormatter.format(point.volumeLbs)} pounds of volume`;
    const tone =
      point.feedback === "Easy"
        ? "info"
        : point.feedback === "Hard"
          ? "primary"
          : "muted";
    const display: BarChartPoint["display"] = hasPlannedWeight
      ? {
          type: "bar",
          tone: "muted",
          dotted: true,
          lines: [
            {
              text: `${numberFormatter.format(point.reps)} reps`,
              strong: true,
            },
            {
              text: `${numberFormatter.format(point.weightLbs)} lbs`,
            },
            {
              text: "Pending",
              tabularNumbers: false,
            },
          ],
        }
      : point.notStarted
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
                  {
                    text:
                      point.feedback === "Easy" || point.feedback === "Hard"
                        ? point.feedback
                        : " ",
                    tabularNumbers: false,
                  },
                ],
              }
            : { type: "empty", label: "0 reps" };

    return {
      key: point.sessionId,
      value: usesRepsAxis && repOnly ? point.reps : point.volumeLbs,
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
        valueAxisLabel={usesRepsAxis ? "REPS" : "VOLUME (LBS)"}
        valueAxisTickInterval={usesRepsAxis ? 5 : undefined}
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
  partial = false,
  superset = false,
  alternatives = [],
}: {
  exerciseName: string;
  sessionName: string;
  insights: ExerciseSetInsights[];
  partial?: boolean;
  /** Main sets are performed as a superset; warmups are still warmups. */
  superset?: boolean;
  /** The activity's alternatives; pressing one opens its own insights. */
  alternatives?: { id: string; name: string; onPress: () => void }[];
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
  const dropSetInsights = insights.filter(
    (setInsights) => setInsights.setType === "Drop",
  );
  // Only the current set's kind starts expanded.
  const startsCollapsed = (setType: ExerciseSetInsights["setType"]) =>
    currentSetType !== undefined && currentSetType !== setType;
  const [warmupSetsCollapsed, setWarmupSetsCollapsed] = useState(() =>
    startsCollapsed("Warmup"),
  );
  const [mainSetsCollapsed, setMainSetsCollapsed] = useState(() =>
    startsCollapsed("Main"),
  );
  const [dropSetsCollapsed, setDropSetsCollapsed] = useState(() =>
    startsCollapsed("Drop"),
  );
  const [alternativesCollapsed, setAlternativesCollapsed] = useState(true);
  const collapsibleSectionScroll = useCollapsibleSectionScroll();

  const handleWarmupSetsCollapsedChange = (collapsed: boolean) => {
    collapsibleSectionScroll.prepareSectionToggle();
    setWarmupSetsCollapsed(collapsed);
  };

  const handleMainSetsCollapsedChange = (collapsed: boolean) => {
    collapsibleSectionScroll.prepareSectionToggle();
    setMainSetsCollapsed(collapsed);
  };

  const handleDropSetsCollapsedChange = (collapsed: boolean) => {
    collapsibleSectionScroll.prepareSectionToggle();
    setDropSetsCollapsed(collapsed);
  };

  const handleAlternativesCollapsedChange = (collapsed: boolean) => {
    collapsibleSectionScroll.prepareSectionToggle();
    setAlternativesCollapsed(collapsed);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pt-5 pb-18 gap-0"
      contentInsetAdjustmentBehavior="automatic"
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
      {partial && (
        <HelperText accessibilityRole="summary">
          Some results are partial because recovered workout details are
          unavailable.
        </HelperText>
      )}
      {warmupSetInsights.length ? (
        <CollapsibleSection
          title="Warmup Sets"
          collapsed={warmupSetsCollapsed}
          onCollapsedChange={handleWarmupSetsCollapsedChange}
          premeasureCollapsedContent
        >
          <View className="mb-3">
            {warmupSetInsights.map((setInsights, index) => (
              <VolumeChart
                key={`${setInsights.setType}-${setInsights.setNumber}`}
                insights={setInsights}
                stack={{ index, size: warmupSetInsights.length }}
              />
            ))}
          </View>
        </CollapsibleSection>
      ) : null}
      <CollapsibleSection
        title={superset ? "Supersets" : "Main Sets"}
        collapsed={mainSetsCollapsed}
        onCollapsedChange={handleMainSetsCollapsedChange}
        premeasureCollapsedContent
      >
        <View
          className={
            dropSetInsights.length || alternatives.length ? "mb-3" : undefined
          }
        >
          {mainSetInsights.map((setInsights, index) => (
            <VolumeChart
              key={`${setInsights.setType}-${setInsights.setNumber}`}
              insights={setInsights}
              stack={{ index, size: mainSetInsights.length }}
              superset={superset}
            />
          ))}
        </View>
      </CollapsibleSection>
      {dropSetInsights.length ? (
        <CollapsibleSection
          title="Drop Sets"
          collapsed={dropSetsCollapsed}
          onCollapsedChange={handleDropSetsCollapsedChange}
          premeasureCollapsedContent
        >
          <View className={alternatives.length ? "mb-3" : undefined}>
            {dropSetInsights.map((setInsights, index) => (
              <VolumeChart
                key={`${setInsights.setType}-${setInsights.setNumber}`}
                insights={setInsights}
                stack={{ index, size: dropSetInsights.length }}
              />
            ))}
          </View>
        </CollapsibleSection>
      ) : null}
      {alternatives.length ? (
        <CollapsibleSection
          title="Alternative Exercises"
          collapsed={alternativesCollapsed}
          onCollapsedChange={handleAlternativesCollapsedChange}
          premeasureCollapsedContent
        >
          <View>
            {alternatives.map((alternative, index) => (
              <NavigationCardRow
                key={alternative.id}
                title={alternative.name}
                cardVariants={["multiline"]}
                stack={{ index, size: alternatives.length }}
                accessibilityLabel={`Navigate to exercise insights for ${alternative.name}`}
                onPress={alternative.onPress}
              />
            ))}
          </View>
        </CollapsibleSection>
      ) : null}
    </ScrollView>
  );
}
