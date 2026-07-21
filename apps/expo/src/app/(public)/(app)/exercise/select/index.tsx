import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";

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

  const exerciseList = sortRecordsByName([...filteredUsedExercises]).concat(
    filteredAvailableExercises.filter(
      (ae) =>
        !filteredUsedExercises.find((e) => exerciseNamesMatch(e.name, ae.name)),
    ),
  ) as Partial<Exercise>[];

  const filteredUnusedExercises = exerciseList.slice(
    filteredUsedExercises.length,
  );

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
          headerSearchBarOptions: {
            placeholder: "Search Exercises",
            onChangeText: (event) => setSearchFilter(event.nativeEvent.text),
            onSearchButtonPress: () => setSearchFilter(""),
            hideNavigationBar: false,
          },
        }}
      />
      <FlatList
        className="flex-1"
        contentContainerClassName={twMerge("px-5")}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={exerciseList}
        keyExtractor={(item, index) => `${item.name}.${index}`}
        ListHeaderComponent={
          <>
            <View className="flex-row items-baseline justify-between px-5 pb-2">
              <SectionHeading placement="inline">
                {filteredUsedExercises.length > 0
                  ? "Your Exercises"
                  : "Available Exercises"}
              </SectionHeading>
              <Link
                href="/(public)/(app)/exercise/settings?parentRoute=select"
                asChild
              >
                <PressableThemed
                  className="flex-row items-center"
                  accessibilityLabel="Navigate to Exercise Settings to add, remove, or edit exercises"
                >
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-primary text-xl font-semibold"
                  >
                    Manage
                  </Text>
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-primary pt-0.5 pl-0.5 text-xl"
                  >
                    <AntDesign name="plus" size={14} />
                  </Text>
                </PressableThemed>
              </Link>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <SelectableCardRow
              title={item.name}
              selected={item.name === selected?.name}
              onPress={() => setSelected(item as Exercise)}
              stack={{
                index:
                  filteredUsedExercises.length > 0 &&
                  index >= filteredUsedExercises.length
                    ? index - filteredUsedExercises.length
                    : index,
                size:
                  filteredUsedExercises.length > 0 &&
                  index >= filteredUsedExercises.length
                    ? filteredUnusedExercises.length
                    : filteredUsedExercises.length || exerciseList.length,
              }}
              cardClassName={
                (filteredUsedExercises.length > 0 &&
                  index === filteredUsedExercises.length - 1) ||
                index === exerciseList.length - 1
                  ? "mb-6"
                  : undefined
              }
            />
            {filteredUsedExercises.length > 0 &&
              index === filteredUsedExercises.length - 1 &&
              filteredAvailableExercises.length > 0 && (
                <View pointerEvents="none">
                  <SectionHeading placement="inlineInset">
                    Available Exercises
                  </SectionHeading>
                </View>
              )}
          </Animated.View>
        )}
      />
    </>
  );
}
