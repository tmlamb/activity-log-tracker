import { useState } from "react";
import { FlatList } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { Exercise } from "@activity-log/ui/utils";
import {
  normalizeExerciseName,
  sortRecordsByName,
} from "@activity-log/ui/utils";

import { NavigationCardRow } from "~/components/CardRow";
import { HeaderPlusAction, HeaderTextAction } from "~/components/HeaderAction";
import { SectionHeading } from "~/components/Typography";
import useExerciseStore from "~/hooks/use-exercise-store";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function ExerciseSettingsScreen() {
  const { parentRoute } = useLocalSearchParams<{ parentRoute?: string }>();
  const router = useRouter();
  const availableExercises = useExerciseStore((state) => state.exercises);
  const storedExercises = useWorkoutStore((state) => state.exercises);
  const usedExercises = storedExercises.filter((exercise) => !exercise.deleted);
  const storedExerciseNames = new Set(
    storedExercises.map((exercise) => normalizeExerciseName(exercise.name)),
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
      (ae) => !storedExerciseNames.has(normalizeExerciseName(ae.name)),
    ),
  ) as Partial<Exercise>[];

  const filteredUnusedExercises = exerciseList.slice(
    filteredUsedExercises.length,
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft:
            parentRoute === "select"
              ? () => (
                  <HeaderTextAction
                    label="Back"
                    onPress={() => router.back()}
                    accessibilityLabel="Go back to exercise selection"
                    color="foreground"
                  />
                )
              : undefined,
          headerRight: () => (
            <Link href="/(public)/(app)/exercise/form" asChild>
              <HeaderPlusAction
                disabled={exerciseList.length > 1000}
                accessibilityLabel="Navigate to Create Exercise Form"
              />
            </Link>
          ),
          headerSearchBarOptions: {
            placeholder: "Search Exercises",
            onChangeText: (event) => {
              setSearchFilter(event.nativeEvent.text);
            },
            onSearchButtonPress: () => {
              setSearchFilter("");
            },
          },
        }}
      />
      {/* Add Exercise button */}
      <FlatList
        className="flex-1"
        contentContainerClassName="px-5"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={exerciseList}
        keyExtractor={(item) => item.exerciseId ?? item.name ?? ""}
        ListHeaderComponent={
          <>
            <SectionHeading className="leading-snug">
              {filteredUsedExercises.length > 0
                ? "Your Exercises"
                : "Available Exercises"}
            </SectionHeading>
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Link
              href={
                (item as Exercise).exerciseId
                  ? `/(public)/(app)/exercise/form?exerciseId=${(item as Exercise).exerciseId}`
                  : `/(public)/(app)/exercise/form?name=${encodeURIComponent(item.name ?? "")}${item.loadKind ? `&loadKind=${item.loadKind}` : ""}${item.primaryMuscles?.length ? `&primaryMuscles=${encodeURIComponent(JSON.stringify(item.primaryMuscles))}` : ""}`
              }
              asChild
            >
              <NavigationCardRow
                title={item.name}
                cardVariants={["multiline"]}
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
                titleClassName="shrink pr-0"
                accessibilityLabel={`Navigate to Edit Exercise with name ${item.name}`}
              />
            </Link>
            {filteredUsedExercises.length > 0 &&
              index === filteredUsedExercises.length - 1 &&
              filteredAvailableExercises.length > 0 && (
                <SectionHeading className="leading-snug">
                  Available Exercises
                </SectionHeading>
              )}
          </Animated.View>
        )}
      />
    </>
  );
}
