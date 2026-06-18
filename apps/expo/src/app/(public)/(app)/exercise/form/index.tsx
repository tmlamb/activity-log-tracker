import { useState } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";

import type { Exercise } from "@activity-log/ui/utils";
import { exerciseNamesMatch } from "@activity-log/ui/utils";

import "react-native-get-random-values";

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import TextInputThemed, {
  TextInputThemedGroup,
} from "~/components/TextInputThemed";
import { HelperText } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

const decimalTextToNumber = (text: string) => {
  if (!text || text === ".") return undefined;

  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

export default function ExerciseFormScreen() {
  const { exerciseId, name: presetName } = useLocalSearchParams<{
    exerciseId?: string;
    name?: string;
  }>();
  const router = useRouter();
  const { exercises, programs, addExercise, updateExercise, deleteExercise } =
    useWorkoutStore((state) => state);

  const exercise = exercises.find((e) => e.exerciseId === exerciseId);
  const [oneRepMaxInput, setOneRepMaxInput] = useState(
    exercise?.oneRepMax?.value && exercise.oneRepMax.value > 0
      ? String(exercise.oneRepMax.value)
      : "",
  );

  const { control, handleSubmit, setError } = useForm<Exercise>({
    defaultValues: {
      name: exercise?.name ?? presetName ?? "",
      oneRepMax: exercise?.oneRepMax ?? undefined,
      primaryMuscle: exercise?.primaryMuscle ?? undefined,
    },
  });

  const usedInWorkout = programs.find((program) =>
    program.sessions.find((session) =>
      session.activities.find(
        (activity) => activity.exerciseId === exercise?.exerciseId,
      ),
    ),
  );

  const hasDuplicateExerciseName = (name: string) =>
    exercises.some(
      (e) =>
        e.exerciseId !== exercise?.exerciseId &&
        exerciseNamesMatch(e.name, name),
    );

  const onSubmit = (data: Exercise) => {
    if (hasDuplicateExerciseName(data.name)) {
      setError("name", {
        type: "validate",
        message: "Exercise name already exists",
      });
      return;
    }

    try {
      if (exercise) {
        updateExercise({
          ...exercise,
          name: data.name,
          oneRepMax: data.oneRepMax,
          primaryMuscle: data.primaryMuscle,
        });
      } else {
        addExercise({
          name: data.name,
          oneRepMax: data.oneRepMax,
          primaryMuscle: data.primaryMuscle,
          exerciseId: uuidv4(),
        });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Exercise name already exists"
      ) {
        setError("name", {
          type: "validate",
          message: "Exercise name already exists",
        });
        return;
      }
      throw error;
    }

    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: exercise ? "Edit Exercise" : "Add Exercise",
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel="Save exercise"
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
      <KeyboardAwareScrollView
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName={twMerge("pt-26 pb-18 gap-10")}
      >
        <TextInputThemedGroup>
          <View>
            <Controller
              name="name"
              control={control}
              rules={{
                required: "Required",
                validate: (value) =>
                  !hasDuplicateExerciseName(value) ||
                  "Exercise name already exists",
              }}
              render={({
                field: { ref, onChange, onBlur, value },
                fieldState: { error },
              }) => (
                <TextInputThemed
                  label="Exercise Name"
                  innerRef={ref}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  maxLength={25}
                  error={error?.message}
                  cardVariants={["square"]}
                />
              )}
            />
            {exercise && usedInWorkout && (
              <HelperText placement="formInset" className="pt-2">
                Warning: Modifying the exercise name reflects in existing
                workouts where it&apos;s been used.
              </HelperText>
            )}
          </View>
          <Controller
            name="oneRepMax"
            control={control}
            rules={{ required: false, min: 5 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInputThemed
                label="One Rep Max (lbs)"
                onChangeText={(text) => {
                  const numericValue = decimalTextToNumber(text);
                  setOneRepMaxInput(text);
                  onChange(
                    numericValue != null
                      ? { unit: value?.unit ?? "lbs", value: numericValue }
                      : undefined,
                  );
                }}
                onBlur={() => {
                  const numericValue = decimalTextToNumber(oneRepMaxInput);
                  setOneRepMaxInput(
                    numericValue != null ? String(numericValue) : "",
                  );
                  onBlur();
                }}
                value={oneRepMaxInput}
                maxLength={7}
                keyboardType="decimal-pad"
                numeric
                decimalPlaces={2}
                accessibilityLabel="One Rep Max in pounds"
                cardVariants={["square"]}
              />
            )}
          />
          {exercise && !usedInWorkout && (
            <ConfirmButton
              accessibilityLabel={`Delete Exercise with name ${exercise.name}`}
              title="Delete Exercise?"
              message="This will permanently delete this exercise."
              confirmText="Delete Exercise"
              onConfirm={() => {
                deleteExercise(exercise.exerciseId);
                router.back();
              }}
              cardVariants={["square"]}
            >
              Delete This Exercise
            </ConfirmButton>
          )}
          {usedInWorkout && (
            <HelperText placement="formInset">
              Exercises used in a workout cannot be deleted.
            </HelperText>
          )}
        </TextInputThemedGroup>
      </KeyboardAwareScrollView>
    </>
  );
}
