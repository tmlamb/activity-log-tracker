import "react-native-get-random-values";

import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { useApplicationDataSnapshot } from "~/data/react/application-data";
import { createProgramFormActions } from "~/data/react/program-form-actions";
import { useProgramHeader } from "~/data/react/program-queries";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";
import ConfirmButton from "./ConfirmButton";
import { HeaderTextAction } from "./HeaderAction";
import MultilineTextInputThemed from "./MultilineTextInputThemed";
import { SQLiteQueryStatus } from "./sqlite-query-status";
import { HelperText } from "./Typography";

/** Mount the form only after its entity seed resolves. */
export function SQLiteProgramForm({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const { programId } = useLocalSearchParams<{ programId?: string }>();
  const snapshot = useApplicationDataSnapshot(runtime);
  const query = useProgramHeader(runtime, programId);
  if (programId !== undefined && query.data === undefined)
    return (
      <SQLiteQueryStatus
        error={query.isError}
        onRetry={() => void query.refetch()}
      />
    );
  if (programId !== undefined && query.data === null)
    return <Redirect href="/(public)/(app)/program/settings" />;
  return (
    <SQLiteProgramFormContent
      key={`${snapshot.generation}:${programId ?? "new"}`}
      runtime={runtime}
      generation={snapshot.generation}
      programId={programId}
      initialName={query.data?.name ?? ""}
    />
  );
}

function SQLiteProgramFormContent({
  runtime,
  generation,
  programId,
  initialName,
}: {
  runtime: ApplicationDataRuntime;
  generation: number;
  programId: string | undefined;
  initialName: string;
}) {
  const router = useRouter();
  const [actions] = useState(() =>
    createProgramFormActions(
      runtime.getSnapshot().service,
      programId,
      uuidv4(),
    ),
  );
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const mounted = useRef(false);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isDirty },
  } = useForm<{ name: string }>({ defaultValues: { name: initialName } });
  const leaveWithoutWarning = useUnsavedChangesWarning(isDirty);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = () =>
    mounted.current && runtime.getSnapshot().generation === generation;

  async function perform(kind: "save" | "delete", name = "") {
    if (pendingRef.current || !isCurrent()) return;
    pendingRef.current = true;
    setPending(true);
    const result =
      kind === "save" ? await actions.save(name) : await actions.remove();
    pendingRef.current = false;
    if (!isCurrent()) return;
    setPending(false);
    if (result.status === "committed") leaveWithoutWarning(() => router.back());
    else if (result.status === "failed")
      Alert.alert(
        kind === "save" ? "Save Failed" : "Delete Failed",
        kind === "save"
          ? "Your changes could not be saved. Please try again."
          : "The program could not be deleted. Please try again.",
      );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: programId ? "Edit Program" : "Add Program",
          headerLeft: () => (
            <HeaderTextAction
              label="Cancel"
              disabled={pending}
              onPress={() => router.back()}
              accessibilityLabel="Go Back Without Saving"
              color="foreground"
            />
          ),
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              disabled={pending}
              onPress={() =>
                void handleSubmit((data) => perform("save", data.name))()
              }
              accessibilityLabel="Save Workout Program"
              weight="bold"
            />
          ),
        }}
      />
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
            onConfirm={() => {
              if (!pendingRef.current) void perform("delete");
            }}
          >
            Delete This Program
          </ConfirmButton>
        )}
      </ScrollView>
    </>
  );
}
