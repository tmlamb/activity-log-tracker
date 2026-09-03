import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { Stack, useRouter } from "expo-router";
import { Entypo } from "@expo/vector-icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

import { PrimaryCardAction } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import InventoryCounterInputRow from "~/components/InventoryCounterInputRow";
import { HelperText, SectionHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

interface FormData {
  muscleGroups: { muscleGroupId: string; name: string }[];
}

export default function ExerciseMusclesScreen() {
  const router = useRouter();
  const { muscleGroups, updateMuscleGroups } = useWorkoutStore(
    (state) => state,
  );
  const { control, getValues, handleSubmit } = useForm<FormData>({
    defaultValues: {
      muscleGroups: muscleGroups.map((name) => ({
        muscleGroupId: uuidv4(),
        name,
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "muscleGroups",
  });

  const addMuscle = () => {
    append(
      { muscleGroupId: uuidv4(), name: "" },
      { focusName: `muscleGroups.${fields.length}.name` },
    );
  };

  const onSubmit = (data: FormData) => {
    updateMuscleGroups(
      data.muscleGroups.map((muscleGroup) => muscleGroup.name),
    );
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderTextAction
              label="Cancel"
              onPress={() => router.back()}
              accessibilityLabel="Go back without saving muscle changes"
              color="foreground"
            />
          ),
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel="Save muscle groups"
              weight="bold"
            />
          ),
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName="px-5 pt-26 pb-18"
      >
        <Animated.View layout={LinearTransition} className="gap-6">
          <HelperText placement="blockStart">
            Add any muscle or muscle group you want to track. Removing a muscle
            also removes it from every exercise when you save.
          </HelperText>
          <Animated.View layout={LinearTransition}>
            <SectionHeading>Muscle Groups</SectionHeading>
            {fields.map((field, index) => {
              const stack = { index, size: fields.length + 1 };

              return (
                <Animated.View
                  key={field.muscleGroupId}
                  entering={FadeInUp}
                  exiting={FadeOutUp}
                  layout={LinearTransition}
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
            <Animated.View layout={LinearTransition}>
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
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </>
  );
}
