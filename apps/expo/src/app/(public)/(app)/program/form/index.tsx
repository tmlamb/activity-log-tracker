import "react-native-get-random-values";

import { Alert, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import ConfirmButton from "~/components/ConfirmButton";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import { HelperText } from "~/components/Typography";
import { createProgram, deleteProgram, renameProgram } from "~/data/actions";
import { useProgramHeader } from "~/data/queries";
import useRouter from "~/hooks/use-router";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

export default function ProgramFormScreen() {
  const { programId } = useLocalSearchParams<{ programId?: string }>();
  const program = useProgramHeader(programId);
  if (programId !== undefined && !program)
    return <MissingDataRedirect href="/(public)/(app)/program/settings" />;
  return (
    <ProgramFormContent
      key={programId ?? "new"}
      programId={programId}
      initialName={program?.name ?? ""}
    />
  );
}

function ProgramFormContent({
  programId,
  initialName,
}: {
  programId: string | undefined;
  initialName: string;
}) {
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isDirty },
  } = useForm<{ name: string }>({ defaultValues: { name: initialName } });
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(isDirty);

  function save(name: string) {
    if (hasLeft()) return;
    try {
      if (programId) renameProgram(programId, name);
      else createProgram(uuidv4(), name);
    } catch {
      Alert.alert(
        "Save Failed",
        "Your changes could not be saved. Please try again.",
      );
      return;
    }
    leaveWithoutWarning(() => router.back());
  }

  function remove(id: string) {
    if (hasLeft()) return;
    try {
      deleteProgram(id);
    } catch {
      Alert.alert(
        "Delete Failed",
        "The program could not be deleted. Please try again.",
      );
      return;
    }
    leaveWithoutWarning(() => router.back());
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: programId ? "Edit Program" : "Add Program",
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          {...headerButton("foreground")}
          accessibilityLabel="Go Back Without Saving"
          onPress={() => router.back()}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          {...headerButton("primary", "bold")}
          accessibilityLabel="Save Workout Program"
          onPress={() => void handleSubmit((data) => save(data.name))()}
        >
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pt-5 gap-10 pb-18"
        contentInsetAdjustmentBehavior="automatic"
      >
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
          {!programId && (
            <HelperText>
              {
                "Give your program a name like 'Strength Training' or 'Weightlifting'."
              }
            </HelperText>
          )}
        </View>
        {programId && (
          <ConfirmButton
            cardVariants={["square"]}
            accessibilityLabel={`Delete Workout Program with name ${getValues("name")}`}
            title="Delete Program?"
            message="This will permanently delete this workout program and its sessions."
            confirmText="Delete Program"
            onConfirm={() => remove(programId)}
          >
            Delete This Program
          </ConfirmButton>
        )}
      </ScrollView>
    </>
  );
}
