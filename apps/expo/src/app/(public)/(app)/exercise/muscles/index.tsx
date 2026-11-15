import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
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

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { PrimaryCardAction } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import InventoryCounterInputRow from "~/components/InventoryCounterInputRow";
import { QueryStatus } from "~/components/query-status";
import { HelperText, SectionHeading } from "~/components/Typography";
import {
  useApplicationDataRuntime,
  useApplicationDataSnapshot,
} from "~/data/react/application-data";
import { useMuscleCatalog } from "~/data/react/settings-queries";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

interface FormData {
  muscleGroups: { muscleGroupId: string; name: string }[];
}

export default function ExerciseMusclesScreen() {
  const runtime = useApplicationDataRuntime();
  return <MuscleScreenContent runtime={runtime} />;
}

function MuscleScreenContent({ runtime }: { runtime: ApplicationDataRuntime }) {
  const snapshot = useApplicationDataSnapshot(runtime);
  const query = useMuscleCatalog(runtime);
  if (query.data === undefined)
    return (
      <QueryStatus error={query.isError} onRetry={() => void query.refetch()} />
    );
  return (
    <MuscleEditor
      key={snapshot.generation}
      muscleGroups={query.data}
      save={snapshot.service.replaceMuscles}
      isCurrent={() => runtime.getSnapshot().generation === snapshot.generation}
    />
  );
}

function MuscleEditor({
  muscleGroups,
  save,
  isCurrent,
}: {
  muscleGroups: string[];
  save: (next: string[], expected: readonly string[]) => Promise<void>;
  isCurrent: () => boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const mounted = useRef(false);
  const base = useRef([...muscleGroups]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
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
  const leaveWithoutWarning = useUnsavedChangesWarning(isDirty);
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
  const canUpdate = () => mounted.current && isCurrent();

  const onSubmit = async (data: FormData) => {
    if (pendingRef.current || !canUpdate()) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await save(
        data.muscleGroups.map((muscleGroup) => muscleGroup.name),
        base.current,
      );
      if (canUpdate()) leaveWithoutWarning(() => router.back());
    } catch (error) {
      if (canUpdate())
        Alert.alert(
          "Save Failed",
          error instanceof Error &&
            error.message.startsWith("Muscle groups changed.")
            ? "Muscle groups changed while this form was open. Your draft is still here; reopen the form before saving."
            : "Muscle groups could not be saved. Please try again.",
        );
    } finally {
      pendingRef.current = false;
      if (canUpdate()) setPending(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderTextAction
              label="Cancel"
              disabled={pending}
              onPress={() => router.back()}
              accessibilityLabel="Go back without saving muscle changes"
              color="foreground"
            />
          ),
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              disabled={pending}
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel="Save muscle groups"
              weight="bold"
            />
          ),
        }}
      />
      <KeyboardAwareScrollView
        pointerEvents={pending ? "none" : "auto"}
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-18"
        contentInsetAdjustmentBehavior="automatic"
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
