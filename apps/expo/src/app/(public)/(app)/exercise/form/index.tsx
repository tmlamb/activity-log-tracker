import { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import {
  Link,
  Redirect,
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Equipment, Exercise } from "@activity-log/ui/utils";
import {
  exerciseNamesMatch,
  normalizeMuscleGroups,
} from "@activity-log/ui/utils";

import type { ExerciseInput } from "~/data/repositories/exercises";
import { Text } from "~/components/font-scale-text";

import "react-native-get-random-values";

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import _ from "lodash";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

import { PrimaryCardAction, SelectableCardRow } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText, SectionHeading } from "~/components/Typography";
import {
  createExercise,
  editExercise,
  restoreExercise,
  setExerciseDeleted,
} from "~/data/actions";
import {
  useEquipment,
  useExerciseLibrary,
  useExerciseUsage,
  useMuscleCatalog,
} from "~/data/queries";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

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

const parsePresetMuscles = (value?: string) => {
  try {
    const muscles = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(muscles) ? normalizeMuscleGroups(muscles) : [];
  } catch {
    return [];
  }
};

type EditorExercise = Omit<Exercise, "loadKind"> & {
  loadKind?: Exercise["loadKind"];
  revision?: number;
};

function sqliteExerciseInput(data: Exercise): ExerciseInput {
  return {
    name: data.name,
    loadKind: data.loadKind,
    barbellId: data.loadKind === "BARBELL" ? (data.barbellId ?? null) : null,
    oneRepMax: data.oneRepMax ?? null,
    primaryMuscles: data.primaryMuscles ?? [],
    notes: data.notes?.trim() ? data.notes : null,
  };
}

export default function ExerciseFormScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const library = useExerciseLibrary();
  const equipment = useEquipment();
  const muscles = useMuscleCatalog();
  const usedInWorkout = useExerciseUsage(exerciseId);
  const rows: EditorExercise[] = library.saved.map((item) => ({
    exerciseId: item.id,
    name: item.name,
    loadKind: item.loadKind ?? undefined,
    barbellId: item.barbellId ?? undefined,
    oneRepMax: item.oneRepMax ?? undefined,
    primaryMuscles: item.primaryMuscles,
    notes: item.notes ?? undefined,
    deleted: item.deleted,
    revision: item.revision,
  }));
  const exercise = rows.find((item) => item.exerciseId === exerciseId);
  if (exerciseId && !exercise)
    return <Redirect href="/(public)/(app)/exercise/settings" />;
  const revision = exercise?.revision;
  return (
    <ExerciseEditor
      key={exerciseId ?? "new"}
      exercise={exercise}
      exercises={rows}
      equipment={equipment}
      muscleGroups={muscles}
      usedInWorkout={usedInWorkout}
      save={(data) => {
        if (!exercise)
          createExercise(data.exerciseId, sqliteExerciseInput(data));
        else if (revision === undefined)
          throw new Error("The exercise revision is unavailable.");
        else if (exercise.deleted)
          restoreExercise(
            exercise.exerciseId,
            revision,
            sqliteExerciseInput(data),
          );
        else
          editExercise(
            exercise.exerciseId,
            revision,
            sqliteExerciseInput(data),
          );
      }}
      remove={(id) => {
        if (revision === undefined)
          throw new Error("The exercise revision is unavailable.");
        setExerciseDeleted(id, true, revision);
      }}
    />
  );
}

function ExerciseEditor({
  exercise: suppliedExercise,
  exercises,
  equipment: suppliedEquipment,
  muscleGroups: suppliedMuscles,
  usedInWorkout,
  save,
  remove,
}: {
  exercise?: EditorExercise;
  exercises: EditorExercise[];
  equipment: Equipment;
  muscleGroups: string[];
  usedInWorkout: boolean;
  save: (data: Exercise) => void;
  remove: (id: string) => void;
}) {
  const {
    name: presetName,
    loadKind: presetLoadKind,
    primaryMuscles: presetPrimaryMuscles,
    unknownLoadKind,
  } = useLocalSearchParams<{
    name?: string;
    loadKind?: string;
    primaryMuscles?: string;
    unknownLoadKind?: string;
  }>();
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  // The form works from the data it opened with; saving checks the captured
  // revision, so a change made elsewhere is reported rather than overwritten.
  const [exercise] = useState(suppliedExercise);
  const [equipment] = useState(suppliedEquipment);
  const [muscleGroups] = useState(suppliedMuscles);
  const [newId] = useState(() => uuidv4());
  const [saveAction] = useState(() => save);
  const [removeAction] = useState(() => remove);
  const heaviestBarbell = _.maxBy(equipment.barbells, "value");
  const defaultLoadKind = exercise
    ? exercise.loadKind
    : unknownLoadKind === "1"
      ? undefined
      : ((isLoadKind(presetLoadKind) ? presetLoadKind : undefined) ??
        inferLoadKindFromName(presetName ?? "") ??
        "BARBELL");
  const [oneRepMaxInput, setOneRepMaxInput] = useState(
    exercise?.oneRepMax?.value && exercise.oneRepMax.value > 0
      ? String(exercise.oneRepMax.value)
      : "",
  );

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { isDirty },
  } = useForm<Exercise>({
    defaultValues: {
      name: exercise?.name ?? presetName ?? "",
      loadKind: defaultLoadKind,
      barbellId: exercise ? exercise.barbellId : heaviestBarbell?.barbellId,
      oneRepMax: exercise?.oneRepMax ?? undefined,
      primaryMuscles: (
        exercise?.primaryMuscles ?? parsePresetMuscles(presetPrimaryMuscles)
      ).filter((muscleGroup) => muscleGroups.includes(muscleGroup)),
      notes: exercise?.notes ?? undefined,
    },
  });
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(isDirty);
  const selectedLoadKind = useWatch({ control, name: "loadKind" });
  const selectedBarbellId = useWatch({ control, name: "barbellId" });
  const selectedName = useWatch({ control, name: "name" });
  const selectedPrimaryMuscles = useWatch({
    control,
    name: "primaryMuscles",
  });
  const hasManuallySelectedLoadKindRef = useRef(false);

  useEffect(() => {
    if (
      selectedLoadKind === "BARBELL" &&
      heaviestBarbell &&
      (!exercise || selectedBarbellId !== undefined) &&
      !equipment.barbells.some(
        (barbell) => barbell.barbellId === selectedBarbellId,
      )
    ) {
      setValue("barbellId", heaviestBarbell.barbellId, { shouldDirty: true });
    }
  }, [
    exercise,
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
      unknownLoadKind === "1" ||
      hasManuallySelectedLoadKindRef.current ||
      !inferredLoadKind ||
      selectedLoadKind === inferredLoadKind
    ) {
      return;
    }

    setValue("loadKind", inferredLoadKind, { shouldDirty: true });
  }, [exercise, selectedLoadKind, selectedName, setValue, unknownLoadKind]);

  useEffect(() => {
    const currentPrimaryMuscles = selectedPrimaryMuscles ?? [];
    const nextPrimaryMuscles = currentPrimaryMuscles.filter((muscleGroup) =>
      muscleGroups.includes(muscleGroup),
    );

    if (nextPrimaryMuscles.length !== currentPrimaryMuscles.length) {
      setValue("primaryMuscles", nextPrimaryMuscles, { shouldDirty: true });
    }
  }, [muscleGroups, selectedPrimaryMuscles, setValue]);

  const hasDuplicateExerciseName = (name: string) =>
    exercises.some(
      (e) =>
        e.exerciseId !== exercise?.exerciseId &&
        !e.deleted &&
        exerciseNamesMatch(e.name, name),
    );
  const onSubmit = (data: Exercise) => {
    if (hasLeft()) return;
    const notes = data.notes?.trim() ? data.notes : undefined;

    if (hasDuplicateExerciseName(data.name)) {
      setError("name", {
        type: "validate",
        message: "Exercise name already exists",
      });
      return;
    }

    try {
      saveAction({
        exerciseId: exercise?.exerciseId ?? newId,
        name: data.name,
        loadKind: data.loadKind,
        barbellId: data.loadKind === "BARBELL" ? data.barbellId : undefined,
        oneRepMax: data.oneRepMax,
        primaryMuscles: data.primaryMuscles,
        notes,
        deleted: exercise?.deleted,
      });
      leaveWithoutWarning(() => router.back());
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
      Alert.alert(
        "Save Failed",
        error instanceof Error &&
          error.message.startsWith("The exercise changed.")
          ? "This exercise changed while the form was open. Your draft is still here; reopen the form before saving."
          : "The exercise could not be saved. Please try again.",
      );
    }
  };

  const onDelete = () => {
    if (!exercise || hasLeft()) return;
    try {
      removeAction(exercise.exerciseId);
      leaveWithoutWarning(() => router.back());
    } catch {
      Alert.alert(
        "Delete Failed",
        "The exercise could not be deleted. Please try again.",
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: exercise ? "Edit Exercise" : "Add Exercise",
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
        {!exercise?.deleted && (
          <Stack.Toolbar.Button
            {...headerButton("primary", "bold")}
            accessibilityLabel="Save exercise"
            onPress={() => void handleSubmit(onSubmit)()}
          >
            Save
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>
      <KeyboardAwareScrollView
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName={twMerge("pt-5 pb-18 gap-10")}
        contentInsetAdjustmentBehavior="automatic"
        mode="layout"
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
          name="oneRepMax"
          control={control}
          rules={{ required: false, min: 5 }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputThemed
              label={`One Rep Max (${exercise?.oneRepMax?.unit ?? "lbs"})`}
              onChangeText={(text) => {
                const numericValue = decimalTextToNumber(text);
                setOneRepMaxInput(text);
                onChange(
                  numericValue != null
                    ? {
                        unit: value?.unit ?? exercise?.oneRepMax?.unit ?? "lbs",
                        value: numericValue,
                      }
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
              accessibilityLabel={`One Rep Max in ${exercise?.oneRepMax?.unit === "kg" ? "kilograms" : "pounds"}`}
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
          <Animated.View
            entering={FadeInUp}
            exiting={FadeOutUp}
            layout={LinearTransition}
          >
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
          </Animated.View>
        )}
        <Animated.View layout={LinearTransition} className="gap-10">
          <View>
            <View className="mb-2 ml-5 flex-row items-center">
              <SectionHeading placement="inline">
                Primary Muscles
              </SectionHeading>
              <Link href="/(public)/(app)/exercise/muscles" asChild>
                <PressableThemed
                  className="-my-3 h-11 w-11 items-center justify-center"
                  accessibilityLabel="Manage muscle groups"
                >
                  <Text maxFontSizeMultiplier={2.5} className="text-primary">
                    <MaterialCommunityIcons
                      name="information-variant-circle-outline"
                      size={22}
                    />
                  </Text>
                </PressableThemed>
              </Link>
            </View>
            <Controller
              name="primaryMuscles"
              control={control}
              render={({ field: { onChange, value = [] } }) => (
                <>
                  {muscleGroups.map((muscleGroup, index) => {
                    const selected = value.includes(muscleGroup);

                    return (
                      <SelectableCardRow
                        key={muscleGroup}
                        title={muscleGroup}
                        selected={selected}
                        onPress={() =>
                          onChange(
                            selected
                              ? value.filter((item) => item !== muscleGroup)
                              : [...value, muscleGroup],
                          )
                        }
                        accessibilityLabel={`${selected ? "Remove" : "Add"} ${muscleGroup} as a primary muscle`}
                        cardVariants={["square"]}
                        stack={{ index, size: muscleGroups.length }}
                      />
                    );
                  })}
                </>
              )}
            />
          </View>
          {exercise?.deleted ? (
            <PrimaryCardAction
              label="Undo Deletion"
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel={`Restore exercise with name ${exercise.name}`}
              cardVariants={["square"]}
            />
          ) : exercise ? (
            <ConfirmButton
              accessibilityLabel={`Delete Exercise with name ${exercise.name}`}
              title="Delete Exercise?"
              message="This will hide the exercise from selection and management. Existing workouts will keep it."
              confirmText="Delete Exercise"
              onConfirm={onDelete}
              cardVariants={["square"]}
            >
              Delete This Exercise
            </ConfirmButton>
          ) : null}
        </Animated.View>
      </KeyboardAwareScrollView>
    </>
  );
}
