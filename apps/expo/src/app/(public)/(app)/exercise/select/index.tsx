import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useNativeVariable } from "react-native-css";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Host } from "@expo/ui";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { Exercise } from "@activity-log/ui/utils";

import "react-native-get-random-values";

import _ from "lodash";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

import {
  exerciseNamesMatch,
  normalizeExerciseName,
  sortRecordsByName,
} from "@activity-log/ui/utils";

import { SelectableCardRow } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import PressableThemed from "~/components/PressableThemed";
import { SectionHeading } from "~/components/Typography";
import useExerciseStore from "~/hooks/use-exercise-store";
import usePendingSelection from "~/hooks/use-pending-selection";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function ExerciseSelectScreen() {
  const { activityId, currentExerciseId } = useLocalSearchParams<{
    activityId: string;
    currentExerciseId?: string;
  }>();
  const router = useRouter();

  const availableExercises = useExerciseStore((state) => state.exercises);
  const {
    exercises: usedExercises,
    equipment,
    addExercise,
  } = useWorkoutStore((state) => state);
  const { setPendingExercise } = usePendingSelection();
  const primaryColor = useNativeVariable("--primary") as string;

  const initialExercise = usedExercises.find(
    (e) => e.exerciseId === currentExerciseId,
  );
  const [selected, setSelected] = useState<Exercise | undefined>(
    initialExercise,
  );
  const [searchFilter, setSearchFilter] = useState<string>();
  const normalizedSearchFilter = searchFilter
    ? normalizeExerciseName(searchFilter)
    : undefined;

  const filteredUsedExercises = usedExercises.filter((ue) =>
    normalizedSearchFilter
      ? normalizeExerciseName(ue.name).includes(normalizedSearchFilter)
      : true,
  );

  const filteredAvailableExercises = availableExercises.filter((ae) =>
    normalizedSearchFilter
      ? normalizeExerciseName(ae.name).includes(normalizedSearchFilter)
      : true,
  );

  const sortedFilteredUsedExercises = sortRecordsByName([
    ...filteredUsedExercises,
  ]) as Exercise[];
  const filteredUnusedExercises = filteredAvailableExercises.filter(
    (ae) =>
      !filteredUsedExercises.find((e) => exerciseNamesMatch(e.name, ae.name)),
  ) as Partial<Exercise>[];

  const handleDone = () => {
    if (!selected) return;
    const existingExercise = usedExercises.find((e) =>
      exerciseNamesMatch(e.name, selected.name),
    );
    const heaviestBarbell = _.maxBy(equipment.barbells, "value");
    const normalizedSelection = selected.exerciseId
      ? selected
      : (existingExercise ?? {
          ...selected,
          exerciseId: uuidv4(),
          barbellId:
            selected.loadKind === "BARBELL"
              ? heaviestBarbell?.barbellId
              : undefined,
        });

    // Add to workout store if it's a preset (not yet in usedExercises)
    if (
      !usedExercises.find(
        (e) => e.exerciseId === normalizedSelection.exerciseId,
      )
    ) {
      addExercise(normalizedSelection);
    }
    setPendingExercise({
      selectionKey: activityId,
      exercise: normalizedSelection,
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Select Exercise",
          headerRight: () => (
            <HeaderTextAction
              label="Done"
              onPress={handleDone}
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
        onChangeText={(event) => setSearchFilter(event.nativeEvent.text)}
        onSearchButtonPress={() => setSearchFilter("")}
        hideNavigationBar={false}
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
      <FlatList
        className="flex-1"
        contentContainerClassName={twMerge("px-5 py-5")}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={sortedFilteredUsedExercises}
        keyExtractor={(item) => item.exerciseId}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <SelectableCardRow
              title={item.name}
              selected={item.name === selected?.name}
              onPress={() => setSelected(item)}
              trailingAccessory={
                <PressableThemed
                  className="-mr-3 h-11 w-11 items-center justify-center"
                  accessibilityLabel={`Edit exercise ${item.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    router.push(
                      `/(public)/(app)/exercise/form?exerciseId=${item.exerciseId}`,
                    );
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
              stack={{
                index,
                size: sortedFilteredUsedExercises.length,
              }}
              cardClassName={
                index === sortedFilteredUsedExercises.length - 1
                  ? "mb-6"
                  : undefined
              }
            />
          </Animated.View>
        )}
        ListFooterComponent={
          <View>
            {filteredUnusedExercises.length > 0 && (
              <>
                <View pointerEvents="none">
                  <SectionHeading placement="inlineInset">
                    More Exercises
                  </SectionHeading>
                </View>
                {filteredUnusedExercises.map((item, index) => (
                  <Animated.View
                    key={item.exerciseId ?? item.name ?? ""}
                    entering={FadeIn}
                    exiting={FadeOut}
                  >
                    <SelectableCardRow
                      title={item.name}
                      selected={item.name === selected?.name}
                      onPress={() => setSelected(item as Exercise)}
                      stack={{
                        index,
                        size: filteredUnusedExercises.length,
                      }}
                      cardClassName={
                        index === filteredUnusedExercises.length - 1
                          ? "mb-6"
                          : undefined
                      }
                    />
                  </Animated.View>
                ))}
              </>
            )}
          </View>
        }
      />
    </>
  );
}
