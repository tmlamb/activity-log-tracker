import "react-native-get-random-values";

import type { Href } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { useNativeVariable } from "react-native-css";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Host } from "@expo/ui";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { v4 as uuidv4 } from "uuid";

import { normalizeExerciseName } from "@activity-log/ui/utils";

import type { SelectionTicket } from "~/data/selection-handoff";
import { SelectableCardRow } from "~/components/CardRow";
import { Text } from "~/components/font-scale-text";
import { HeaderTextAction } from "~/components/HeaderAction";
import PressableThemed from "~/components/PressableThemed";
import { LegendSectionListStyled } from "~/components/Styled";
import { SectionHeading } from "~/components/Typography";
import { materializeExercisePreset } from "~/data/actions";
import { useExerciseLibrary } from "~/data/queries";
import { getSavedExercise } from "~/data/repositories/exercises";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { read, useGeneration } from "~/data/store";

type Library = ReturnType<typeof useExerciseLibrary>;
interface Choice {
  kind: "saved" | "preset";
  id: string;
  name: string;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  muscles: string[];
}
interface Section {
  key: "used" | "unused";
  data: Choice[];
}

export default function ExerciseSelectScreen() {
  const params = useLocalSearchParams<{
    requestId?: string;
    ownerId?: string;
    generation?: string;
    activityId?: string;
    currentExerciseId?: string;
  }>();
  const generation = useGeneration();
  const entry = useSelectionHandoff((state) =>
    params.requestId ? state.entries[params.requestId] : undefined,
  );
  const library = useExerciseLibrary();
  if (
    entry?.kind !== "exercise" ||
    entry.ticket.ownerId !== params.ownerId ||
    entry.ticket.activityId !== params.activityId ||
    String(entry.ticket.generation) !== params.generation ||
    entry.ticket.generation !== generation
  )
    return <Redirect href="/(public)/(app)" />;
  return (
    <ExercisePicker
      key={entry.ticket.requestId}
      ticket={entry.ticket}
      library={library}
      currentExerciseId={params.currentExerciseId}
    />
  );
}

function ExercisePicker({
  ticket,
  library,
  currentExerciseId,
}: {
  ticket: SelectionTicket;
  library: Library;
  currentExerciseId?: string;
}) {
  const router = useRouter();
  const primaryColor = useNativeVariable("--primary") as string;
  const [selected, setSelected] = useState<{
    kind: "saved" | "preset";
    id: string;
  } | null>(() =>
    library.saved.some(
      (item) => item.id === currentExerciseId && !item.deleted,
    ) && currentExerciseId
      ? { kind: "saved", id: currentExerciseId }
      : null,
  );
  const [filter, setFilter] = useState("");
  const names = new Set(
    library.saved.map(({ name }) => normalizeExerciseName(name)),
  );
  const search = normalizeExerciseName(filter);
  const saved: Choice[] = library.saved
    .filter(
      (item) =>
        !item.deleted && normalizeExerciseName(item.name).includes(search),
    )
    .map((item) => ({
      kind: "saved",
      id: item.id,
      name: item.name,
      loadKind: item.loadKind,
      muscles: item.primaryMuscles,
    }));
  const presets: Choice[] = library.presets
    .filter(
      (item) =>
        !names.has(normalizeExerciseName(item.name)) &&
        normalizeExerciseName(item.name).includes(search),
    )
    .map((item) => ({
      kind: "preset",
      id: item.id,
      name: item.name,
      loadKind: item.loadKind,
      muscles: item.primaryMuscles,
    }));
  const sections: Section[] = [];
  if (saved.length)
    sections.push({
      key: "used",
      data: saved.sort((a, b) => a.name.localeCompare(b.name)),
    });
  if (presets.length)
    sections.push({
      key: "unused",
      data: presets,
    });
  const done = () => {
    if (!selected) return;
    try {
      const id =
        selected.kind === "preset"
          ? materializeExercisePreset(selected.id, uuidv4())
          : selected.id;
      if (selected.kind === "saved") {
        const savedExercise = read((db) => getSavedExercise(db, id));
        if (!savedExercise || savedExercise.deleted)
          throw new Error("The selected exercise is no longer available.");
      }
      if (
        !useSelectionHandoff
          .getState()
          .complete(ticket, { kind: "exercise", exerciseId: id })
      )
        throw new Error("This selection request is no longer active.");
      router.back();
    } catch (error) {
      Alert.alert(
        "Selection Failed",
        error instanceof Error
          ? error.message
          : "The exercise could not be selected.",
      );
    }
  };
  const formHref = (choice: Choice): Href =>
    choice.kind === "saved"
      ? `/(public)/(app)/exercise/form?exerciseId=${encodeURIComponent(choice.id)}`
      : `/(public)/(app)/exercise/form?name=${encodeURIComponent(choice.name)}${choice.loadKind ? `&loadKind=${choice.loadKind}` : "&unknownLoadKind=1"}${choice.muscles.length ? `&primaryMuscles=${encodeURIComponent(JSON.stringify(choice.muscles))}` : ""}`;
  return (
    <>
      <Stack.Screen
        options={{
          title: "Select Exercise",
          headerRight: () => (
            <HeaderTextAction
              label="Done"
              onPress={done}
              disabled={!selected}
              accessibilityLabel="Confirm exercise selection"
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
      <Stack.SearchBar
        placeholder="Search Exercises"
        onChangeText={(event) => setFilter(event.nativeEvent.text)}
        onSearchButtonPress={() => setFilter("")}
        hideNavigationBar={false}
      />
      <LegendSectionListStyled
        className="flex-1"
        contentContainerClassName="px-5 py-5"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        recycleItems={false}
        maintainVisibleContentPosition={false}
        sections={sections}
        extraData={`${selected?.kind}:${selected?.id}`}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        renderSectionHeader={({ section }) =>
          section.key === "unused" ? (
            <View pointerEvents="none">
              <SectionHeading placement="inlineInset">
                More Exercises
              </SectionHeading>
            </View>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <SelectableCardRow
              title={item.name}
              cardVariants={["multiline"]}
              selected={selected?.kind === item.kind && selected.id === item.id}
              onPress={() => setSelected({ kind: item.kind, id: item.id })}
              trailingAccessory={
                <PressableThemed
                  className="-mr-3 h-11 w-11 items-center justify-center"
                  accessibilityLabel={`Edit exercise ${item.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    router.push(formHref(item));
                  }}
                >
                  <Text maxFontSizeMultiplier={2.5} className="text-primary">
                    <MaterialCommunityIcons
                      name="information-variant-circle-outline"
                      size={22}
                    />
                  </Text>
                </PressableThemed>
              }
              stack={{ index, size: section.data.length }}
              cardClassName={
                index === section.data.length - 1 ? "mb-6" : undefined
              }
            />
          </Animated.View>
        )}
      />
      <Host ignoreSafeArea="all">
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
          <Stack.Toolbar.Spacer />
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel="Add exercise"
            onPress={() => router.push("/(public)/(app)/exercise/form")}
            tintColor={primaryColor}
            separateBackground
          />
        </Stack.Toolbar>
      </Host>
    </>
  );
}
