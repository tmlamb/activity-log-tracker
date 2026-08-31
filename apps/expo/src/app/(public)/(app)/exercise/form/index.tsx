import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Exercise } from "@activity-log/ui/utils";
import { exerciseNamesMatch } from "@activity-log/ui/utils";

import "react-native-get-random-values";

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import _ from "lodash";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

import { SelectableCardRow } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText, SectionHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

const decimalTextToNumber = (text: string) => {
  if (!text || text === ".") return undefined;

  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

const inferLoadKindFromName = (
  name: string,
): Exercise["loadKind"] | undefined => {
  if (/\bdumbbells?\b/i.test(name)) return "WEIGHT_PAIR";
  if (/\bbarbells?\b/i.test(name)) return "BARBELL";
  return undefined;
};

const isLoadKind = (value?: string): value is Exercise["loadKind"] =>
  value === "BARBELL" || value === "WEIGHT_PAIR" || value === "SINGLE_WEIGHT";

export default function ExerciseFormScreen() {
  const {
    exerciseId,
    name: presetName,
    loadKind: presetLoadKind,
  } = useLocalSearchParams<{
    exerciseId?: string;
    name?: string;
    loadKind?: string;
  }>();
  const router = useRouter();
  const {
    exercises,
    programs,
    equipment,
    addExercise,
    updateExercise,
    deleteExercise,
  } = useWorkoutStore((state) => state);

  const exercise = exercises.find((e) => e.exerciseId === exerciseId);
  const heaviestBarbell = _.maxBy(equipment.barbells, "value");
  const defaultLoadKind =
    exercise?.loadKind ??
    (isLoadKind(presetLoadKind) ? presetLoadKind : undefined) ??
    inferLoadKindFromName(presetName ?? "") ??
    "BARBELL";
  const [oneRepMaxInput, setOneRepMaxInput] = useState(
    exercise?.oneRepMax?.value && exercise.oneRepMax.value > 0
      ? String(exercise.oneRepMax.value)
      : "",
  );

  const { control, handleSubmit, setError, setValue } = useForm<Exercise>({
    defaultValues: {
      name: exercise?.name ?? presetName ?? "",
      loadKind: defaultLoadKind,
      barbellId: exercise?.barbellId ?? heaviestBarbell?.barbellId,
      oneRepMax: exercise?.oneRepMax ?? undefined,
      primaryMuscle: exercise?.primaryMuscle ?? undefined,
      notes: exercise?.notes ?? undefined,
    },
  });
  const selectedLoadKind = useWatch({ control, name: "loadKind" });
  const selectedBarbellId = useWatch({ control, name: "barbellId" });
  const selectedName = useWatch({ control, name: "name" });
  const hasManuallySelectedLoadKindRef = useRef(false);

  useEffect(() => {
    if (
      selectedLoadKind === "BARBELL" &&
      heaviestBarbell &&
      !equipment.barbells.some(
        (barbell) => barbell.barbellId === selectedBarbellId,
      )
    ) {
      setValue("barbellId", heaviestBarbell.barbellId);
    }
  }, [
    equipment.barbells,
    heaviestBarbell,
    selectedBarbellId,
    selectedLoadKind,
    setValue,
  ]);

  useEffect(() => {
    const inferredLoadKind = inferLoadKindFromName(selectedName);
    if (
      exercise ||
      hasManuallySelectedLoadKindRef.current ||
      !inferredLoadKind ||
      selectedLoadKind === inferredLoadKind
    ) {
      return;
    }

    setValue("loadKind", inferredLoadKind, { shouldDirty: true });
  }, [exercise, selectedLoadKind, selectedName, setValue]);

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
    const notes = data.notes?.trim() ? data.notes : undefined;

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
          loadKind: data.loadKind,
          barbellId: data.loadKind === "BARBELL" ? data.barbellId : undefined,
          oneRepMax: data.oneRepMax,
          primaryMuscle: data.primaryMuscle,
          notes,
        });
      } else {
        addExercise({
          name: data.name,
          loadKind: data.loadKind,
          barbellId: data.loadKind === "BARBELL" ? data.barbellId : undefined,
          oneRepMax: data.oneRepMax,
          primaryMuscle: data.primaryMuscle,
          notes,
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
              <MultilineTextInputThemed
                label="Exercise Name"
                innerRef={ref}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                maxLength={50}
                error={error?.message}
                cardVariants={["square"]}
              />
            )}
          />
          {exercise && usedInWorkout && (
            <HelperText placement="formInset" className="pt-2">
              Warning: Modifying the exercise name reflects in existing workouts
              where it&apos;s been used.
            </HelperText>
          )}
        </View>
        <Controller
          name="loadKind"
          control={control}
          rules={{ required: "Required" }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <View>
              <SegmentedInputThemed
                label="Equipment"
                value={value}
                error={error?.message}
                accessibilityLabel="Exercise equipment style"
                options={[
                  {
                    label: "Barbell",
                    value: "BARBELL",
                    accessibilityLabel: "Exercise uses a barbell",
                  },
                  {
                    label: "Pair",
                    value: "WEIGHT_PAIR",
                    accessibilityLabel: "Exercise uses a pair of weights",
                  },
                  {
                    label: "Single",
                    value: "SINGLE_WEIGHT",
                    accessibilityLabel: "Exercise uses a single weight",
                  },
                ]}
                onChange={(nextLoadKind) => {
                  hasManuallySelectedLoadKindRef.current = true;
                  onChange(nextLoadKind);
                }}
                cardVariants={["square"]}
              />
              <HelperText placement="formInset" className="pt-2">
                Sets how weight is counted. Pair means one weight per side (e.g.
                dumbbells); Single means one weight (e.g. kettlebells or
                machines).
              </HelperText>
            </View>
          )}
        />
        {selectedLoadKind === "BARBELL" && (
          <View>
            {equipment.barbells.length > 0 ? (
              <>
                <View className="mb-2 ml-5 flex-row items-center">
                  <SectionHeading placement="inline">
                    Barbell Weight
                  </SectionHeading>
                  <Link href="/(public)/(app)/equipment" asChild>
                    <PressableThemed
                      className="-my-3 h-11 w-11 items-center justify-center"
                      accessibilityLabel="Manage equipment"
                    >
                      <Text
                        maxFontSizeMultiplier={2.5}
                        className="text-primary"
                      >
                        <MaterialCommunityIcons
                          name="information-variant-circle-outline"
                          size={22}
                        />
                      </Text>
                    </PressableThemed>
                  </Link>
                </View>
                <Controller
                  name="barbellId"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field: { onChange, value } }) => (
                    <>
                      {equipment.barbells.map((barbell, index) => (
                        <SelectableCardRow
                          key={barbell.barbellId}
                          title={`${barbell.value}${barbell.unit}`}
                          selected={barbell.barbellId === value}
                          onPress={() => onChange(barbell.barbellId)}
                          accessibilityLabel={`Use ${barbell.value} pound barbell for this exercise`}
                          cardVariants={["square"]}
                          stack={{ index, size: equipment.barbells.length }}
                        />
                      ))}
                    </>
                  )}
                />
              </>
            ) : (
              <HelperText placement="formInset">
                To select a barbell weight for this exercise,{" "}
                <Link href="/(public)/(app)/equipment" asChild>
                  <Text
                    className="text-primary"
                    accessibilityLabel="Add a barbell in equipment settings"
                    accessibilityRole="link"
                  >
                    add a barbell
                  </Text>
                </Link>{" "}
                in the equipment settings.
              </HelperText>
            )}
          </View>
        )}
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
        <Controller
          name="notes"
          control={control}
          render={({ field: { ref, onChange, onBlur, value } }) => (
            <MultilineTextInputThemed
              label="Notes"
              innerRef={ref}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
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
      </KeyboardAwareScrollView>
    </>
  );
}
