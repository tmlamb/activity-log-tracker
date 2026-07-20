import { useState } from "react";
import { FlatList } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import _ from "lodash";

import type { Session } from "@activity-log/ui/utils";
import { weekAndDayFromStart } from "@activity-log/ui/utils";

import { SelectableCardRow } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import { HelperText } from "~/components/Typography";
import usePendingSelection from "~/hooks/use-pending-selection";
import useWorkoutStore from "~/hooks/use-workout-store";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

export default function SessionSelectScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const router = useRouter();

  const { programs } = useWorkoutStore((state) => state);
  const { setPendingSession } = usePendingSelection();

  const program = programs.find((p) => p.programId === programId);
  const sessions = program?.sessions ?? [];

  // Only completed sessions (have an end date) make sense as templates
  const sessionsSorted = _(sessions)
    .filter("end")
    .orderBy(["start"], ["desc"])
    .value();
  const programStart = _.last(sessionsSorted)?.start ?? new Date();

  const [selected, setSelected] = useState<Session | undefined>();

  const handleDone = () => {
    if (!selected) return;
    setPendingSession({ session: selected });
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Select Template",
          headerRight: () => (
            <HeaderTextAction
              label="Done"
              onPress={handleDone}
              disabled={!selected}
              accessibilityLabel="Use selected session as template"
              weight="bold"
            />
          ),
          headerLeft: () => (
            <HeaderTextAction
              label="Cancel"
              onPress={() => router.back()}
              color="foreground"
            />
          ),
        }}
      />
      <FlatList
        className="flex-1"
        contentContainerClassName="pt-26 px-5 pb-18"
        data={sessionsSorted}
        keyExtractor={(item, index) => `${item.name}.${index}`}
        ListHeaderComponent={
          sessionsSorted.length > 0 ? (
            <HelperText placement="listHeader">
              Select a previous session to use as a template.
            </HelperText>
          ) : (
            <HelperText placement="listHeader">
              No completed sessions in current program.
            </HelperText>
          )
        }
        renderItem={({ item, index }) => (
          <SelectableCardRow
            title={item.name}
            selected={item.sessionId === selected?.sessionId}
            stack={{ index, size: sessionsSorted.length }}
            trailingText={weekAndDayFromStart(
              programStart,
              item.start ?? new Date(),
            )}
            onPress={() => {
              // Strip timing data so it can be used as a fresh template.
              // Set weights are retained so RPE templates can prefill them.
              setSelected({
                ...item,
                sessionId: item.sessionId,
                start: undefined,
                end: undefined,
                status: "Planned",
                activities: item.activities.map((actvy) => ({
                  ...actvy,
                  activityId: uuidv4(),
                  warmupSets: actvy.warmupSets.map((ws) => ({
                    ...ws,
                    workoutSetId: uuidv4(),
                    start: undefined,
                    end: undefined,
                    actualReps: 0,
                    status: "Planned" as const,
                  })),
                  mainSets: actvy.mainSets.map((ms) => ({
                    ...ms,
                    workoutSetId: uuidv4(),
                    start: undefined,
                    end: undefined,
                    actualReps: 0,
                    status: "Planned" as const,
                  })),
                })),
              });
            }}
          />
        )}
      />
    </>
  );
}
