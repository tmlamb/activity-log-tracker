import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, View } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { Stack, useLocalSearchParams } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Exercise, Load } from "@activity-log/ui/utils";

import { Text } from "~/components/font-scale-text";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import { AnimatedViewStyled } from "~/components/Styled";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText, SectionHeading } from "~/components/Typography";
import { setExerciseOneRepMax } from "~/data/actions";
import { isDropPercentValid } from "~/data/domain/session-editor-draft";
import { DEFAULT_DROP_PERCENT } from "~/data/domain/set-execution";
import { useExerciseDetail } from "~/data/queries";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { useGeneration } from "~/data/store";
import useRouter from "~/hooks/use-router";

type FormData = Partial<Load> & {
  oneRepMaxVal?: number;
  dropPercent?: number;
};

const decimalTextToNumber = (text: string) => {
  if (!text || text === ".") return undefined;

  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

const percentNumToString = (value?: number) => {
  if (value == null) return "";
  return String(Number((value * 100).toFixed(2)));
};

const percentStringToNum = (value: string) => {
  const percentValue = decimalTextToNumber(value);
  return percentValue == null ? undefined : percentValue / 100;
};

type LoadExercise = Pick<Exercise, "exerciseId" | "name" | "oneRepMax">;

export default function LoadScreen() {
  const params = useLocalSearchParams<{
    requestId?: string;
    ownerId?: string;
    generation?: string;
    activityId?: string;
    exerciseId?: string;
  }>();
  const generation = useGeneration();
  const entry = useSelectionHandoff((state) =>
    params.requestId ? state.entries[params.requestId] : undefined,
  );
  const record = useExerciseDetail(params.exerciseId);
  if (
    entry?.kind !== "load" ||
    entry.ticket.ownerId !== params.ownerId ||
    entry.ticket.activityId !== params.activityId ||
    String(entry.ticket.generation) !== params.generation ||
    entry.ticket.generation !== generation
  )
    return <MissingDataRedirect />;
  const initial: LoadExercise | undefined = record
    ? {
        exerciseId: record.id,
        name: record.name,
        oneRepMax: record.oneRepMax ?? undefined,
      }
    : undefined;
  const ticket = entry.ticket;
  return (
    <LoadEditor
      key={ticket.requestId}
      exercise={initial}
      onDone={(load, max, dropPercent) => {
        if (load.type === "PERCENT" && record && max)
          setExerciseOneRepMax(
            record.id,
            { value: max, unit: record.oneRepMax?.unit ?? "lbs" },
            record.oneRepMax,
          );
        if (
          !useSelectionHandoff.getState().complete(ticket, {
            kind: "load",
            load,
            ...(dropPercent === undefined ? {} : { dropPercent }),
          })
        )
          throw new Error("This selection request is no longer active.");
      }}
    />
  );
}

function LoadEditor({
  exercise: suppliedExercise,
  onDone,
}: {
  exercise?: LoadExercise;
  onDone: (
    load: Load,
    max: number | undefined,
    dropPercent: number | undefined,
  ) => void;
}) {
  const { loadType, loadValue, dropSetCount, dropPercent } =
    useLocalSearchParams<{
      loadType?: string;
      loadValue?: string;
      /** The row's drop sets; their percentage is offered when it has any. */
      dropSetCount?: string;
      /** The row's drop percentage, or empty for the default. */
      dropPercent?: string;
    }>();
  const hasDropSets = Number(dropSetCount) > 0;
  const initialDropPercent = dropPercent
    ? Number(dropPercent)
    : DEFAULT_DROP_PERCENT;
  const [dropPercentInput, setDropPercentInput] = useState(
    percentNumToString(initialDropPercent),
  );
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  // Work from the exercise as it was when the screen opened.
  const [exercise] = useState(suppliedExercise);
  const [done] = useState(() => onDone);
  const [oneRepMaxInput, setOneRepMaxInput] = useState(
    exercise?.oneRepMax?.value && exercise.oneRepMax.value > 0
      ? String(exercise.oneRepMax.value)
      : "",
  );

  const initialLoad: Partial<Load> | undefined =
    loadType && loadValue
      ? { type: loadType as Load["type"], value: Number(loadValue) }
      : undefined;
  const [percentInput, setPercentInput] = useState(
    initialLoad?.type === "PERCENT"
      ? percentNumToString(initialLoad.value)
      : "",
  );

  const { control, handleSubmit, setValue, clearErrors, trigger, reset } =
    useForm<FormData>({
      defaultValues: {
        type: initialLoad?.type,
        value: initialLoad?.value,
        oneRepMaxVal: exercise?.oneRepMax?.value,
        dropPercent: initialDropPercent,
      },
      reValidateMode: "onChange",
      mode: "onChange",
    });

  const [selectedType, selectedValue, selectedOneRepMaxVal, selectedDrop] =
    useWatch({
      control,
      name: ["type", "value", "oneRepMaxVal", "dropPercent"],
    });
  const selected =
    selectedType != null && selectedValue != null
      ? { type: selectedType, value: selectedValue }
      : undefined;
  const onSubmit = async () => {
    // Ignore a second tap while the first is closing this screen.
    if (router.isNavigating()) return;
    if (
      !(await trigger(hasDropSets ? ["value", "dropPercent"] : "value")) ||
      !selected ||
      router.isNavigating()
    )
      return;
    try {
      done(
        selected,
        selectedOneRepMaxVal,
        hasDropSets ? selectedDrop : undefined,
      );
      router.back();
    } catch (error) {
      Alert.alert(
        "Save Failed",
        error instanceof Error &&
          error.message.startsWith("The one-rep max changed.")
          ? "The one-rep max changed while this form was open. Your draft is still here; reopen the form before saving."
          : "The load could not be saved. Please try again.",
      );
    }
  };

  return (
    <>
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
          accessibilityLabel="Confirm load selection"
          onPress={() => void handleSubmit(onSubmit)()}
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pt-5 gap-10"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Type selector: RPE / %1RM */}
          <Controller
            name="type"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange }, fieldState: { error } }) => (
              <SegmentedInputThemed
                label="Type"
                value={selectedType}
                error={error ? "Select a type" : undefined}
                accessibilityLabel="Load type"
                options={[
                  {
                    label: "RPE",
                    value: "RPE",
                    accessibilityLabel: "Rate of perceived exertion",
                  },
                  {
                    label: "%1RM",
                    value: "PERCENT",
                    accessibilityLabel: "Percent of one rep max",
                  },
                ]}
                onChange={(nextType) => {
                  onChange(nextType);

                  if (nextType === "PERCENT") {
                    clearErrors("value");
                    setPercentInput(
                      initialLoad?.type === nextType
                        ? percentNumToString(initialLoad.value)
                        : "0",
                    );
                  }

                  setValue(
                    "value",
                    initialLoad?.type === nextType ? initialLoad.value : 0,
                    {
                      shouldValidate: false,
                    },
                  );

                  if (initialLoad?.type === nextType) {
                    reset();
                  }
                }}
                cardVariants={["square"]}
              />
            )}
          />

          {/* RPE value input */}
          {selectedType === "RPE" && (
            <AnimatedViewStyled
              entering={FadeInUp.duration(1000)
                .springify()
                .stiffness(50)
                .damping(6)
                .mass(0.3)}
              exiting={FadeOutDown.duration(1000)
                .springify()
                .stiffness(50)
                .damping(6)
                .mass(0.3)}
              className="gap-10"
            >
              <Controller
                name="value"
                control={control}
                rules={{ required: true, min: 1, max: 10 }}
                render={({
                  field: { ref, onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <TextInputThemed
                    label="RPE Value"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    innerRef={ref}
                    value={value != null ? String(value) : undefined}
                    placeholder="0"
                    maxLength={2}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={
                      error ? "RPE value must be between 1 and 10" : undefined
                    }
                    cardVariants={["square"]}
                  />
                )}
              />
              <View className="px-5">
                <View className="mb-1.5">
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-muted mb-1.5 text-xl font-bold"
                  >
                    Rate of Perceived Exertion scale (RPE)
                  </Text>
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-muted text-xl"
                  >
                    Measures intensity of a given weight and number of reps.
                    Values are on a 1 to 10 scale:
                  </Text>
                </View>
                <View className="">
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-muted mb-1 text-xl"
                  >
                    10 - Another rep would be impossible.
                  </Text>
                </View>
                <View className="">
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-muted mb-1 text-xl"
                  >
                    9 - You left one in the tank.
                  </Text>
                </View>
                <View className="">
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-muted mb-1 text-xl"
                  >
                    8 - You could have done a couple more.
                  </Text>
                </View>
                <View className="">
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className="text-muted mb-1 text-xl"
                  >
                    etc.
                  </Text>
                </View>
              </View>
            </AnimatedViewStyled>
          )}

          {/* %1RM value input */}
          {selectedType === "PERCENT" && (
            <AnimatedViewStyled
              entering={FadeInUp.duration(1000)
                .springify()
                .stiffness(50)
                .damping(6)
                .mass(0.3)}
              exiting={FadeOutDown.duration(1000)
                .springify()
                .stiffness(50)
                .damping(6)
                .mass(0.3)}
              className="gap-10"
            >
              <Controller
                name="value"
                control={control}
                rules={{ required: true, min: 0.0001, max: 1 }}
                render={({
                  field: { ref, onChange, onBlur },
                  fieldState: { error },
                }) => (
                  <TextInputThemed
                    label="% of One Rep Max"
                    onChangeText={(newValue) => {
                      setPercentInput(newValue);
                      onChange(percentStringToNum(newValue));
                    }}
                    onBlur={() => {
                      const percentValue = decimalTextToNumber(percentInput);
                      setPercentInput(
                        percentValue != null ? String(percentValue) : "",
                      );
                      onChange(
                        percentValue != null ? percentValue / 100 : undefined,
                      );
                      onBlur();
                    }}
                    innerRef={ref}
                    value={percentInput}
                    placeholder="00.00"
                    maxLength={5}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    numeric
                    decimalPlaces={2}
                    error={
                      error
                        ? "Percentage must be between 0.01 and 100"
                        : undefined
                    }
                    cardVariants={["square"]}
                  />
                )}
              />
              {exercise && (
                <Animated.View
                  entering={FadeInUp.delay(250)
                    .duration(1000)
                    .springify()
                    .stiffness(50)
                    .damping(6)
                    .mass(0.3)}
                  exiting={FadeOutDown.delay(100)
                    .duration(1000)
                    .springify()
                    .stiffness(50)
                    .damping(6)
                    .mass(0.3)}
                >
                  <SectionHeading placement="inset">
                    {exercise.name}
                  </SectionHeading>
                  <Controller
                    control={control}
                    name="oneRepMaxVal"
                    rules={{ required: true, min: 1 }}
                    render={({
                      field: { onChange, onBlur },
                      fieldState: { error },
                    }) => (
                      <TextInputThemed
                        label={`One Rep Max (${exercise.oneRepMax?.unit ?? "lbs"})`}
                        onChangeText={(text) => {
                          setOneRepMaxInput(text);
                          onChange(decimalTextToNumber(text));
                        }}
                        onBlur={() => {
                          const numericValue =
                            decimalTextToNumber(oneRepMaxInput);
                          setOneRepMaxInput(
                            numericValue != null ? String(numericValue) : "",
                          );
                          onBlur();
                        }}
                        value={oneRepMaxInput || undefined}
                        maxLength={7}
                        keyboardType="decimal-pad"
                        numeric
                        decimalPlaces={2}
                        error={error ? "Required" : undefined}
                        accessibilityLabel={`One Rep Max in ${exercise.oneRepMax?.unit === "kg" ? "kilograms" : "pounds"}`}
                        cardVariants={["square"]}
                      />
                    )}
                  />
                  {(!exercise.oneRepMax || exercise.oneRepMax.value <= 0) && (
                    <HelperText>
                      Enter a One Rep Max for this exercise in order to use the
                      %1RM load type.
                    </HelperText>
                  )}
                </Animated.View>
              )}
              <View className="px-5">
                <SectionHeading placement="description">
                  One Rep Max (1RM)
                </SectionHeading>
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-muted text-xl"
                >
                  Heaviest weight that can be lifted for one rep.
                </Text>
                <SectionHeading placement="description" className="mt-6">
                  % of One Rep Max (%1RM)
                </SectionHeading>
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-muted text-xl"
                >
                  A way to quantify the amount to be lifted in a set,
                  proportional to the 1RM.
                </Text>
              </View>
            </AnimatedViewStyled>
          )}

          {/* Drop set percentage, for a row with drop sets */}
          {hasDropSets && (
            <View>
              <Controller
                name="dropPercent"
                control={control}
                rules={{
                  validate: (value) => isDropPercentValid(value ?? null),
                }}
                render={({
                  field: { ref, onChange, onBlur },
                  fieldState: { error },
                }) => (
                  <TextInputThemed
                    label="Drop Set Reduction (%)"
                    onChangeText={(newValue) => {
                      setDropPercentInput(newValue);
                      onChange(percentStringToNum(newValue));
                    }}
                    onBlur={() => {
                      const value = decimalTextToNumber(dropPercentInput);
                      setDropPercentInput(value != null ? String(value) : "");
                      onBlur();
                    }}
                    innerRef={ref}
                    value={dropPercentInput}
                    placeholder="00.00"
                    maxLength={5}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    numeric
                    decimalPlaces={2}
                    error={
                      error
                        ? "Percentage must be between 0 and 99.99"
                        : undefined
                    }
                    cardVariants={["square"]}
                  />
                )}
              />
              <HelperText>
                Each drop set is this much lighter than the set before it.
              </HelperText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
