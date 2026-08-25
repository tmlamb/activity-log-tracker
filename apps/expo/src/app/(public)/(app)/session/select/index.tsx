import { useState } from "react";
import { FlatList } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import _ from "lodash";

import type { Session } from "@activity-log/ui/utils";
import { isSessionTerminalStatus } from "@activity-log/ui/utils";

import { SelectableCardRow } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import { HelperText } from "~/components/Typography";
import usePendingSelection from "~/hooks/use-pending-selection";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function SessionSelectScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const router = useRouter();

  const { programs } = useWorkoutStore((state) => state);
  const { setPendingSession } = usePendingSelection();

  const program = programs.find((p) => p.programId === programId);
  const sessions = program?.sessions ?? [];

  // Only terminal sessions make sense as templates. For template lineages,
  // show only the latest terminal session in each lineage.
  const sessionsSorted = _(sessions)
    .filter(
      (session) => isSessionTerminalStatus(session.status) && !!session.end,
    )
    .orderBy(["start"], ["desc"])
    .uniqBy((session) => session.templateId ?? session.sessionId)
    .reverse()
    .value();

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
        keyExtractor={(item) => item.sessionId}
        ListHeaderComponent={
          sessionsSorted.length > 0 ? (
            <HelperText placement="listHeader">
              Select a previous session to use as a template.
            </HelperText>
          ) : (
            <HelperText placement="listHeader">
              No previous sessions are available as templates.
            </HelperText>
          )
        }
        renderItem={({ item, index }) => (
          <SelectableCardRow
            title={item.name}
            selected={item.sessionId === selected?.sessionId}
            stack={{ index, size: sessionsSorted.length }}
            cardVariants={["multiline"]}
            onPress={() => {
              setSelected(item);
            }}
          />
        )}
      />
    </>
  );
}
