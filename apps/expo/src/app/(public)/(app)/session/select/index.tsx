import { useState } from "react";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { TemplateChoice } from "~/data/repositories/templates";
import type { SelectionTicket } from "~/data/selection-handoff";
import { SelectableCardRow } from "~/components/CardRow";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import { LegendListStyled } from "~/components/Styled";
import { HelperText } from "~/components/Typography";
import { useTemplateChoices } from "~/data/queries";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { useGeneration } from "~/data/store";

export default function SessionSelectScreen() {
  const params = useLocalSearchParams<{
    programId: string;
    requestId?: string;
    ownerId?: string;
    generation?: string;
  }>();
  const generation = useGeneration();
  const entry = useSelectionHandoff((state) =>
    params.requestId ? state.entries[params.requestId] : undefined,
  );
  const choices = useTemplateChoices(params.programId);
  if (
    entry?.kind !== "template" ||
    entry.ticket.ownerId !== params.ownerId ||
    String(entry.ticket.generation) !== params.generation ||
    entry.ticket.generation !== generation
  )
    return <Redirect href="/(public)/(app)" />;
  return (
    <TemplatePicker
      key={entry.ticket.requestId}
      ticket={entry.ticket}
      programId={params.programId}
      choices={choices}
    />
  );
}

function TemplatePicker({
  ticket,
  programId,
  choices,
}: {
  ticket: SelectionTicket;
  programId: string;
  choices: TemplateChoice[];
}) {
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  const [selected, setSelected] = useState<string>();
  const done = () => {
    if (!selected) return;
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
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          {...headerButton("foreground")}
          onPress={() => router.back()}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          {...headerButton("primary", "bold")}
          disabled={!selected}
          accessibilityLabel="Use selected session as template"
          onPress={done}
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
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
