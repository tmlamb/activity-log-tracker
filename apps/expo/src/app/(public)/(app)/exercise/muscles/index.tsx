import { useRef } from "react";
import { Alert, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Stack } from "expo-router";
import { Entypo } from "@expo/vector-icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

import { PrimaryCardAction } from "~/components/CardRow";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import InventoryCounterInputRow from "~/components/InventoryCounterInputRow";
import { HelperText, SectionHeading } from "~/components/Typography";
import { replaceMuscles } from "~/data/actions";
import { useMuscleCatalog } from "~/data/queries";
import useRouter from "~/hooks/use-router";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

interface FormData {
  muscleGroups: { muscleGroupId: string; name: string }[];
}

export default function ExerciseMusclesScreen() {
  const muscleGroups = useMuscleCatalog();
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  const base = useRef([...muscleGroups]);
  const {
    control,
    getValues,
    handleSubmit,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: {
      muscleGroups: muscleGroups.map((name) => ({
        muscleGroupId: uuidv4(),
        name,
      })),
    },
  });
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(isDirty);
  const { fields, append, remove } = useFieldArray({
    control,
    name: "muscleGroups",
  });

  // A new row takes focus, and opening the keyboard can stall the UI thread. Layout
  // transitions on the content it pushes down could then end without their
  // final position (react-native-reanimated#10171, fixed in 4.6), leaving that
  // content on top of the row. So rows fade, but nothing animates its layout.
  const addMuscle = () => {
    append(
      { muscleGroupId: uuidv4(), name: "" },
      { focusName: `muscleGroups.${fields.length}.name` },
    );
  };
  const onSubmit = (data: FormData) => {
    if (hasLeft()) return;
    try {
      replaceMuscles(
        data.muscleGroups.map((muscleGroup) => muscleGroup.name),
        base.current,
      );
      leaveWithoutWarning(() => router.back());
    } catch (error) {
      Alert.alert(
        "Save Failed",
        error instanceof Error &&
          error.message.startsWith("Muscle groups changed.")
          ? "Muscle groups changed while this form was open. Your draft is still here; reopen the form before saving."
          : "Muscle groups could not be saved. Please try again.",
      );
    }
  };

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          {...headerButton("foreground")}
          accessibilityLabel="Go back without saving muscle changes"
          onPress={() => router.back()}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          {...headerButton("primary", "bold")}
          accessibilityLabel="Save muscle groups"
          onPress={() => void handleSubmit(onSubmit)()}
        >
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <KeyboardAwareScrollView
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-18"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="gap-6">
          <HelperText placement="blockStart">
            Add any muscle or muscle group you want to track. Removing a muscle
            also removes it from every exercise when you save.
          </HelperText>
          <View>
            <SectionHeading>Muscle Groups</SectionHeading>
            {fields.map((field, index) => {
              const stack = { index, size: fields.length + 1 };

              return (
                <Animated.View
                  key={field.muscleGroupId}
                  entering={FadeInUp}
                  exiting={FadeOutUp}
                  collapsable={false}
                >
                  <Controller
                    name={`muscleGroups.${index}.name`}
                    control={control}
                    rules={{
                      required: "Required",
                      validate: (value) => {
                        const normalizedValue = value
                          .trim()
                          .toLocaleLowerCase();
                        if (!normalizedValue) return "Required";

                        return (
                          !getValues("muscleGroups").some(
                            (muscleGroup, muscleGroupIndex) =>
                              muscleGroupIndex < index &&
                              muscleGroup.name.trim().toLocaleLowerCase() ===
                                normalizedValue,
                          ) || "Already added"
                        );
                      },
                    }}
                    render={({
                      field: { ref, onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <InventoryCounterInputRow
                        innerRef={ref}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        unit=""
                        inputAccessibilityLabel="Muscle group name"
                        placeholder="Muscle name"
                        maxLength={50}
                        keyboardType="default"
                        error={error?.message}
                        stack={stack}
                        trailing={{
                          type: "remove",
                          onRemove: () => remove(index),
                          removeAccessibilityLabel: `Remove muscle group ${value}`,
                          removeAccessibilityHint:
                            "Removes this muscle from the list when saved.",
                          removeConfirmationTitle: "Remove Muscle?",
                          removeConfirmationMessage:
                            "This will remove the muscle from every exercise when you save.",
                        }}
                      />
                    )}
                  />
                </Animated.View>
              );
            })}
            <View>
              <PrimaryCardAction
                label="Add Muscle"
                icon={<Entypo name="circle-with-plus" size={20} />}
                onPress={addMuscle}
                stack={
                  fields.length > 0
                    ? { index: fields.length, size: fields.length + 1 }
                    : undefined
                }
              />
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </>
  );
}
