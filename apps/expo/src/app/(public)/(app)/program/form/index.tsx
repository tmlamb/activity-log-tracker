import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";

import type { Program } from "@activity-log/ui/utils";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import { HelperText } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function ProgramFormScreen() {
  const { programId } = useLocalSearchParams<{ programId?: string }>();
  const router = useRouter();
  const { programs, addProgram, updateProgram, deleteProgram } =
    useWorkoutStore((state) => state);

  const program = programs.find((p) => p.programId === programId);

  type FormData = Pick<Program, "name">;
  const { control, handleSubmit, getValues } = useForm<FormData>({
    defaultValues: { name: program?.name },
  });

  const isEdit = !!program;

  const onSubmit = (data: FormData) => {
    if (program) {
      updateProgram({ ...program, name: data.name });
    } else {
      addProgram({ name: data.name, programId: uuidv4(), sessions: [] });
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: isEdit ? "Edit Program" : "Add Program",
          headerLeft: () => (
            <HeaderTextAction
              label="Cancel"
              onPress={() => router.back()}
              accessibilityLabel="Go Back Without Saving"
              color="foreground"
            />
          ),
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel="Save Workout Program"
              weight="bold"
            />
          ),
        }}
      />

      <View className="flex-1 gap-10 pt-26">
        <View>
          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({
              field: { onChange, ref, onBlur, value },
              fieldState: { error },
            }) => (
              <MultilineTextInputThemed
                onChangeText={onChange}
                onBlur={onBlur}
                innerRef={ref}
                value={value}
                label="Program Name"
                maxLength={50}
                error={error ? "Required" : undefined}
                accessibilityLabel="Enter Workout Program Name"
                testID="program-name-input"
                cardVariants={["square"]}
              />
            )}
          />
          {!isEdit && (
            <HelperText>
              {`Give your program a name like 'Strength Training' or 'Weightlifting'.`}
            </HelperText>
          )}
        </View>
        {isEdit && (
          <ConfirmButton
            cardVariants={["square"]}
            accessibilityLabel={`Delete Workout Program with name ${getValues("name")}`}
            title="Delete Program?"
            message="This will permanently delete this workout program and its sessions."
            confirmText="Delete Program"
            onConfirm={() => {
              deleteProgram(program.programId);
              router.back();
            }}
          >
            Delete This Program
          </ConfirmButton>
        )}
      </View>
    </>
  );
}
