import { useState } from "react";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { Exercise } from "@activity-log/ui/utils";
import {
  normalizeExerciseName,
  sortRecordsByName,
} from "@activity-log/ui/utils";

import { NavigationCardRow } from "~/components/CardRow";
import { HeaderPlusAction, HeaderTextAction } from "~/components/HeaderAction";
import { LegendSectionListStyled } from "~/components/Styled";
import { SectionHeading } from "~/components/Typography";
import useExerciseStore from "~/hooks/use-exercise-store";
import useWorkoutStore from "~/hooks/use-workout-store";

interface ExerciseSection {
  key: "used" | "available";
  title: string;
  data: Partial<Exercise>[];
}

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

  const sortedFilteredUsedExercises = sortRecordsByName([
    ...filteredUsedExercises,
  ]) as Partial<Exercise>[];
  const filteredUnusedExercises = filteredAvailableExercises.filter(
    (ae) => !storedExerciseNames.has(normalizeExerciseName(ae.name)),
  ) as Partial<Exercise>[];
  const exerciseSections: ExerciseSection[] = [];

  if (sortedFilteredUsedExercises.length > 0) {
    exerciseSections.push({
      key: "used",
      title: "Your Exercises",
      data: sortedFilteredUsedExercises,
    });
  }
  if (filteredUnusedExercises.length > 0 || exerciseSections.length === 0) {
    exerciseSections.push({
      key: "available",
      title: "Available Exercises",
      data: filteredUnusedExercises,
    });
  }

  const exerciseCount = exerciseSections.reduce(
    (count, section) => count + section.data.length,
    0,
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
                disabled={exerciseCount > 1000}
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
      <LegendSectionListStyled
        className="flex-1"
        contentContainerClassName="px-5"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        recycleItems={false}
        maintainVisibleContentPosition={false}
        sections={exerciseSections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.exerciseId ?? item.name ?? ""}
        renderSectionHeader={({ section }) => (
          <SectionHeading className="leading-snug">
            {section.title}
          </SectionHeading>
        )}
        renderItem={({ item, index, section }) => (
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
                  index,
                  size: section.data.length,
                }}
                cardClassName={
                  index === section.data.length - 1 ? "mb-6" : undefined
                }
                titleClassName="shrink pr-0"
                accessibilityLabel={`Navigate to Edit Exercise with name ${item.name}`}
              />
            </Link>
          </Animated.View>
        )}
      />
    </>
  );
}
