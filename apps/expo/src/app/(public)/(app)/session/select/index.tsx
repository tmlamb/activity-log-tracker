import { useState } from "react";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useQuery } from "@tanstack/react-query";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import type { SelectionTicket } from "~/data/react/selection-handoff";
import type { TemplateChoice } from "~/data/repositories/templates";
import { SelectableCardRow } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import { QueryStatus } from "~/components/query-status";
import { LegendListStyled } from "~/components/Styled";
import { HelperText } from "~/components/Typography";
import { getMemoryTemplateChoices } from "~/data/application-memory";
import { workoutKeys } from "~/data/cache/keys";
import {
  useApplicationDataRuntime,
  useApplicationDataSnapshot,
} from "~/data/react/application-data";
import { useSelectionHandoff } from "~/data/react/selection-handoff";

export default function SessionSelectScreen() {
  const runtime = useApplicationDataRuntime();
  const params = useLocalSearchParams<{
    programId: string;
    requestId?: string;
    ownerId?: string;
    generation?: string;
  }>();
  const snapshot = useApplicationDataSnapshot(runtime);
  const focused = useIsFocused();
  const entry = useSelectionHandoff((state) =>
    params.requestId ? state.entries[params.requestId] : undefined,
  );
  const query = useQuery({
    queryKey: workoutKeys.templates(snapshot.generation, params.programId),
    queryFn: () => {
      const latest = runtime.getSnapshot();
      if (latest.generation !== snapshot.generation)
        throw new Error("The workout dataset has changed.");
      return latest.memory
        ? Promise.resolve(
            getMemoryTemplateChoices(latest.memory, params.programId),
          )
        : latest.service.templateChoices(params.programId);
    },
    initialData: () =>
      snapshot.memory
        ? getMemoryTemplateChoices(snapshot.memory, params.programId)
        : undefined,
    enabled: focused,
    retryOnMount: false,
  });
  if (
    entry?.kind !== "template" ||
    entry.ticket.ownerId !== params.ownerId ||
    String(entry.ticket.generation) !== params.generation ||
    entry.ticket.generation !== snapshot.generation
  )
    return <Redirect href="/(public)/(app)" />;
  if (query.data === undefined)
    return (
      <QueryStatus error={query.isError} onRetry={() => void query.refetch()} />
    );
  return (
    <TemplatePicker
      key={entry.ticket.requestId}
      runtime={runtime}
      ticket={entry.ticket}
      programId={params.programId}
      choices={query.data}
    />
  );
}

function TemplatePicker({
  runtime,
  ticket,
  programId,
  choices,
}: {
  runtime: ApplicationDataRuntime;
  ticket: SelectionTicket;
  programId: string;
  choices: TemplateChoice[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>();
  const done = () => {
    if (!selected || runtime.getSnapshot().generation !== ticket.generation)
      return;
    if (
      useSelectionHandoff
        .getState()
        .complete(ticket, { kind: "template", programId, sessionId: selected })
    )
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
              onPress={done}
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
      <LegendListStyled
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-18"
        contentInsetAdjustmentBehavior="automatic"
        recycleItems={false}
        maintainVisibleContentPosition={false}
        data={choices}
        estimatedItemSize={53}
        extraData={selected}
        keyExtractor={(item) => item.sessionId}
        ListHeaderComponent={
          <HelperText placement="listHeader">
            {choices.length
              ? "Select a previous session to use as a template."
              : "No previous sessions are available as templates."}
          </HelperText>
        }
        renderItem={({ item, index }) => (
          <SelectableCardRow
            title={item.name}
            selected={item.sessionId === selected}
            stack={{ index, size: choices.length }}
            cardVariants={["multiline"]}
            onPress={() => setSelected(item.sessionId)}
          />
        )}
      />
    </>
  );
}
