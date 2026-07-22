import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Load } from "@activity-log/ui/utils";

import { HeaderTextAction } from "~/components/HeaderAction";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import { AnimatedViewStyled } from "~/components/Styled";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText, SectionHeading } from "~/components/Typography";
import usePendingSelection from "~/hooks/use-pending-selection";
import useWorkoutStore from "~/hooks/use-workout-store";

type FormData = Partial<Load> & { oneRepMaxVal?: number };

const decimalTextToNumber = (text: string) => {
  if (!text || text === ".") return undefined;

  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

export default function LoadScreen() {
  const { activityId, exerciseId, loadType, loadValue } = useLocalSearchParams<{
    activityId: string;
    exerciseId?: string;
    loadType?: string;
    loadValue?: string;
  }>();
  const router = useRouter();

  const { exercises, updateExercise } = useWorkoutStore((state) => state);
  const { setPendingLoad } = usePendingSelection();
  const exercise = exercises.find((e) => e.exerciseId === exerciseId);
  const [oneRepMaxInput, setOneRepMaxInput] = useState(
    exercise?.oneRepMax?.value && exercise.oneRepMax.value > 0
      ? String(exercise.oneRepMax.value)
      : "",
  );

  const initialLoad: Partial<Load> | undefined =
    loadType && loadValue
      ? { type: loadType as Load["type"], value: Number(loadValue) }
      : undefined;

  const { control, handleSubmit, setValue, clearErrors, trigger, reset } =
    useForm<FormData>({
      defaultValues: {
        type: initialLoad?.type,
        value: initialLoad?.value,
        oneRepMaxVal: exercise?.oneRepMax?.value,
      },
      reValidateMode: "onChange",
      mode: "onChange",
    });

  const [selectedType, selectedValue, selectedOneRepMaxVal] = useWatch({
    control,
    name: ["type", "value", "oneRepMaxVal"],
  });
  const selected =
    selectedType != null && selectedValue != null
      ? { type: selectedType, value: selectedValue }
      : undefined;

  const onSubmit = async () => {
    if (!(await trigger("value"))) return;

    if (selectedType === "PERCENT" && exercise && selectedOneRepMaxVal) {
      updateExercise({
        ...exercise,
        oneRepMax: { value: selectedOneRepMaxVal, unit: "lbs" },
      });
    }
    if (selected) {
      setPendingLoad({ selectionKey: activityId, load: selected });
    }
    router.back();
  };

  const percentNumToString = (value?: number) => {
    if (value == null) return "";
    return String(Number((value * 100).toFixed(2)));
  };

  const percentStringToNum = (value: string) => {
    const percentValue = decimalTextToNumber(value);
    return percentValue == null ? undefined : percentValue / 100;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderTextAction
              label="Done"
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel="Confirm load selection"
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

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView className="flex-1" contentContainerClassName="pt-26 gap-10">
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
                rules={{ required: true, min: 0.001, max: 0.9999 }}
                render={({
                  field: { ref, onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <TextInputThemed
                    label="% of One Rep Max"
                    onChangeText={(newValue) => {
                      onChange(percentStringToNum(newValue));
                    }}
                    onBlur={onBlur}
                    innerRef={ref}
                    value={value ? percentNumToString(value) : undefined}
                    placeholder="00.00"
                    maxLength={5}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    numeric
                    decimalPlaces={2}
                    error={error ? "Required" : undefined}
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
                        label="One Rep Max (lbs)"
                        placeholder="Required"
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
                        accessibilityLabel="One Rep Max in pounds"
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
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
