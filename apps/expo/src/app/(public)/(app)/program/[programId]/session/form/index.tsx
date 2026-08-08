import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInLeft,
  FadeInUp,
  FadeOutDown,
  FadeOutLeft,
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
import { useIsFocused } from "expo-router/react-navigation";
import { AntDesign, Entypo } from "@expo/vector-icons";
import { add, differenceInMinutes } from "date-fns";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import type {
  Activity,
  Exercise,
  MainSet,
  Session,
  WarmupSet,
} from "@activity-log/ui/utils";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

import { stringifyLoad } from "@activity-log/ui/utils";

import type { WorkoutStore } from "~/hooks/use-workout-store";
import Card from "~/components/Card";
import { NavigationCardRow, PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import { AnimatedViewStyled } from "~/components/Styled";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText } from "~/components/Typography";
import usePendingSelection from "~/hooks/use-pending-selection";
import useWorkoutStore from "~/hooks/use-workout-store";

const activityListTransition = LinearTransition.duration(220);
const activityEditorCardClassName =
  "h-auto flex-row items-stretch gap-0 rounded-none p-0";
const activityEditorInputCardVariants: React.ComponentProps<
  typeof TextInputThemed
>["cardVariants"] = ["square", "small", "transparent"];

export interface SessionFormData {
  name: string;
  start?: Date;
  end?: Date;
  status: "Planned" | "Ready" | "Done";
  activities: Activity[];
}

const numberToWorkoutSetArray = <
  T extends {
    workoutSetId: string;
    type: string;
    status: string;
    start?: Date;
    end?: Date;
    actualReps?: number;
    feedback: string;
  },
>(
  length: number,
  current: T[],
  type: "Warmup" | "Main",
  session?: Session,
): T[] => {
  const newArray = [...current];
  if (length < current.length) {
    newArray.splice(length, newArray.length - length);
  } else if (length > newArray.length) {
    newArray.push(
      ...Array.from(Array(length - newArray.length)).map(
        () =>
          ({
            workoutSetId: uuidv4(),
            type,
            status: session?.status === "Done" ? "Done" : "Planned",
            start: session?.status === "Done" ? session.end : undefined,
            end: session?.status === "Done" ? session.end : undefined,
            actualReps: 0,
            feedback: "Neutral",
          }) as T,
      ),
    );
  }
  return newArray;
};

const plannedRepsFromTemplateActivity = (activity: Activity) => {
  const actualReps = activity.mainSets.reduce(
    (result, mainSet) => {
      if (
        mainSet.status === "Done" &&
        mainSet.actualReps != null &&
        mainSet.actualReps > 0
      ) {
        result.total += mainSet.actualReps;
        result.count += 1;
      }
      return result;
    },
    { total: 0, count: 0 },
  );

  if (!actualReps.count) return activity.reps;

  return Math.ceil(actualReps.total / actualReps.count);
};

export default function SessionFormScreen() {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId?: string;
  }>();
  const { programs, exercises, addSession, updateSession, deleteSession } =
    useWorkoutStore((store) => store);

  const program = programs.find((p) => p.programId === programId);
  const session = program?.sessions.find((s) => s.sessionId === sessionId);

  if (!program) {
    return <Redirect href="/(public)/(app)" />;
  }

  return (
    <SessionFormScreenContent
      program={program}
      session={session}
      exercises={exercises}
      addSession={addSession}
      updateSession={updateSession}
      deleteSession={deleteSession}
      programId={programId}
    />
  );
}

function SessionFormScreenContent({
  program,
  session,
  exercises,
  addSession,
  updateSession,
  deleteSession,
  programId,
}: {
  program: WorkoutStore["programs"][number];
  session?: Session;
  exercises: WorkoutStore["exercises"];
  addSession: WorkoutStore["addSession"];
  updateSession: WorkoutStore["updateSession"];
  deleteSession: WorkoutStore["deleteSession"];
  programId: string;
}) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const sessions = program.sessions;

  const { control, handleSubmit, getFieldState, reset, setValue, formState } =
    useForm<SessionFormData>({
      defaultValues: {
        name: session?.name ?? "",
        end: session?.end ?? undefined,
        activities: session?.activities ?? [],
      },
    });

  const fieldArray = useFieldArray({ control, name: "activities" });
  const { fields, append, remove, swap } = fieldArray;
  const { isDirty } = formState;
  const persistedActivityIds = new Set(
    session?.activities.map((activity) => activity.activityId) ?? [],
  );
  const [fromType, setFromType] = useState<
    "Scratch" | "Template" | undefined
  >();
  const templateSourceSessionRef = useRef<Session | undefined>(undefined);
  const watchActivities = useWatch({ control, name: "activities" });

  // Consume pending selection store (populated by exercise/select, load, session/select modals)
  const {
    pendingExercise,
    clearPendingExercise,
    pendingLoad,
    clearPendingLoad,
    pendingSession,
    clearPendingSession,
  } = usePendingSelection();

  const handleExerciseSelect = (selectedExercise: Exercise, index: number) => {
    if (selectedExercise.oneRepMax && selectedExercise.oneRepMax.value > 0) {
      setValue(`activities.${index}.load`, { type: "PERCENT", value: 0.75 });
    } else {
      setValue(`activities.${index}.load`, { type: "RPE", value: 8 });
    }

    setValue(
      `activities.${index}.warmupSets`,
      (watchActivities[index]?.warmupSets ?? []).map((warmupSet) => ({
        ...warmupSet,
        weight: undefined,
        feedback: "Neutral" as const,
      })),
      { shouldDirty: true },
    );
    setValue(
      `activities.${index}.mainSets`,
      (watchActivities[index]?.mainSets ?? []).map((mainSet) => ({
        ...mainSet,
        weight: undefined,
        feedback: "Neutral" as const,
      })),
      { shouldDirty: true },
    );
  };

  const buildTemplateFormData = (template: Session): SessionFormData => ({
    name: template.name,
    start: undefined,
    end: undefined,
    status: "Planned",
    activities: template.activities.map((activity) => ({
      ...activity,
      activityId: uuidv4(),
      reps: plannedRepsFromTemplateActivity(activity),
      warmupSets: activity.warmupSets.map((warmupSet) => ({
        workoutSetId: uuidv4(),
        type: "Warmup" as const,
        status: "Planned" as const,
        start: undefined,
        end: undefined,
        weight: activity.load.type === "RPE" ? warmupSet.weight : undefined,
        actualReps: 0,
        feedback: warmupSet.feedback,
      })),
      mainSets: activity.mainSets.map((mainSet) => ({
        workoutSetId: uuidv4(),
        type: "Main" as const,
        status: "Planned" as const,
        start: undefined,
        end: undefined,
        weight: activity.load.type === "RPE" ? mainSet.weight : undefined,
        actualReps: 0,
        feedback: mainSet.feedback,
      })),
    })),
  });

  const resetToScratch = () => {
    templateSourceSessionRef.current = undefined;
    reset({
      name: "",
      start: undefined,
      end: undefined,
      status: "Planned",
      activities: [],
    });
    setFromType("Scratch");
  };

  const navigateToTemplatePicker = () => {
    void router.push(
      `/(public)/(app)/session/select?programId=${programId}&parentRoute=form`,
    );
  };

  const confirmSourceChange = (
    nextValue: "Scratch" | "Template",
    onConfirm: () => void,
  ) => {
    if (!isDirty) {
      onConfirm();
      return;
    }

    Alert.alert(
      "Change Plan Source?",
      `Switching to ${nextValue === "Scratch" ? "Plan From Scratch" : "Plan From Template"} will discard your edits.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard Edits",
          style: "destructive",
          onPress: onConfirm,
        },
      ],
    );
  };

  // Apply exercise selection returned from exercise/select modal
  useEffect(() => {
    if (!pendingExercise) return;
    const index = fields.findIndex(
      (f) => f.activityId === pendingExercise.selectionKey,
    );
    if (index === -1) {
      clearPendingExercise();
      return;
    }
    setValue(
      `activities.${index}.exerciseId`,
      pendingExercise.exercise.exerciseId,
      { shouldDirty: true, shouldValidate: true, shouldTouch: true },
    );
    handleExerciseSelect(pendingExercise.exercise, index);
    clearPendingExercise();
  }, [pendingExercise]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply load selection returned from load modal
  useEffect(() => {
    if (!pendingLoad) return;
    const index = fields.findIndex(
      (f) => f.activityId === pendingLoad.selectionKey,
    );
    if (index === -1) {
      clearPendingLoad();
      return;
    }
    setValue(`activities.${index}.load`, pendingLoad.load, {
      shouldDirty: true,
    });
    if (pendingLoad.load.type === "PERCENT") {
      setValue(
        `activities.${index}.warmupSets`,
        (watchActivities[index]?.warmupSets ?? []).map((warmupSet) => ({
          ...warmupSet,
          weight: warmupSet.status === "Planned" ? undefined : warmupSet.weight,
        })),
        { shouldDirty: true },
      );
      setValue(
        `activities.${index}.mainSets`,
        (watchActivities[index]?.mainSets ?? []).map((mainSet) => ({
          ...mainSet,
          weight: mainSet.status === "Planned" ? undefined : mainSet.weight,
        })),
        { shouldDirty: true },
      );
    }
    clearPendingLoad();
  }, [pendingLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply session template returned from session/select modal
  useEffect(() => {
    if (!pendingSession) return;
    reset(buildTemplateFormData(pendingSession.session));
    templateSourceSessionRef.current = pendingSession.session;
    queueMicrotask(() => setFromType("Template"));
    clearPendingSession();
  }, [pendingSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (data: SessionFormData) => {
    if (session) {
      updateSession(program.programId, {
        name: data.name,
        sessionId: session.sessionId,
        templateId: session.templateId,
        activities: data.activities,
        start: session.start,
        end: data.end,
        status: session.status,
      });
    } else {
      const templateSourceSession = templateSourceSessionRef.current;
      const templateId = templateSourceSession
        ? (templateSourceSession.templateId ?? uuidv4())
        : undefined;
      if (
        templateSourceSession &&
        templateSourceSession.templateId !== templateId
      ) {
        updateSession(program.programId, {
          ...templateSourceSession,
          templateId,
        });
      }
      addSession(program.programId, {
        name: data.name,
        sessionId: uuidv4(),
        templateId,
        activities: data.activities,
        start: undefined,
        end: undefined,
        status: "Planned",
      });
      templateSourceSessionRef.current = undefined;
    }
    router.back();
  };

  const removeActivity = (index: number, activityId: string) => {
    if (!persistedActivityIds.has(activityId)) {
      remove(index);
      return;
    }

    Alert.alert(
      "Delete Activity?",
      "This will remove the activity from this session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Activity",
          style: "destructive",
          onPress: () => remove(index),
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: session ? "Edit Session" : "Add Session",
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              onPress={handleSubmit(onSubmit)}
              disabled={!session && !!sessions.length && !fromType}
              accessibilityLabel="Save session and close form"
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
        contentContainerClassName="pt-26 gap-10 pb-18"
        enabled={isFocused}
      >
        {!session && !!sessions.length && (
          <SegmentedInputThemed
            label="Plan From"
            value={fromType}
            accessibilityLabel="Choose session source"
            cardVariants={["square"]}
            compact
            options={[
              {
                label: "Scratch",
                value: "Scratch",
                accessibilityLabel: "Create new session from scratch",
              },
              {
                label: "Template",
                value: "Template",
                accessibilityLabel: "Navigate to template selection",
              },
            ]}
            onChange={(nextValue) => {
              if (nextValue === "Scratch") {
                confirmSourceChange("Scratch", resetToScratch);
                return;
              }

              confirmSourceChange("Template", navigateToTemplatePicker);
            }}
          />
        )}
        {(fromType ?? session ?? !sessions.length) && (
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
            <View>
              <Controller
                name="name"
                control={control}
                rules={{ required: true }}
                render={({
                  field: { onChange, ref, onBlur, value },
                  fieldState: { error },
                }) => (
                  <TextInputThemed
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    label="Session Name"
                    innerRef={ref}
                    maxLength={25}
                    cardVariants={["square"]}
                    error={error ? "Required" : undefined}
                  />
                )}
              />
              {program.sessions.length < 3 && fromType !== "Template" && (
                <HelperText className="leading-tight">
                  Use a descriptive name like &apos;Lower Body&apos; or
                  &apos;Chest Day&apos;.
                </HelperText>
              )}
            </View>
            {/* Activities Input */}
            <Animated.View layout={activityListTransition}>
              {fields.map((item, index) => {
                const exerciseFieldState = getFieldState(
                  `activities.${index}.exerciseId`,
                  formState,
                );

                return (
                  <Animated.View
                    key={item.activityId}
                    collapsable={false}
                    entering={FadeInUp.duration(220)}
                    exiting={FadeOutUp.duration(220)}
                  >
                    <Card
                      className={activityEditorCardClassName}
                      variants={["square"]}
                      stack={{ size: fields.length + 1, index }}
                    >
                      <View
                        className={
                          exerciseFieldState.error
                            ? "relative z-10 flex-initial basis-1/2 justify-evenly"
                            : "border-border relative flex-initial basis-1/2 justify-evenly border-r"
                        }
                      >
                        {exerciseFieldState.error ? (
                          <View
                            pointerEvents="none"
                            className="border-destructive absolute inset-0 z-10 border"
                          />
                        ) : null}
                        <Controller
                          name={`activities.${index}.exerciseId`}
                          control={control}
                          rules={{ required: true }}
                          render={({
                            field: { value },
                            fieldState: { error },
                          }) => {
                            const ex = exercises.find(
                              (e) => e.exerciseId === value,
                            );

                            return (
                              <View className="relative py-2 pb-6">
                                <Link
                                  href={`/(public)/(app)/exercise/select?activityIndex=${index}&activityId=${item.activityId}&currentExerciseId=${value}`}
                                  asChild
                                >
                                  <PressableThemed accessibilityLabel="Navigate to select exercise form">
                                    <View
                                      className={
                                        error
                                          ? "h-auto w-full flex-row items-center justify-between gap-2 pr-3 pl-5"
                                          : "h-auto w-full flex-row items-center justify-between gap-2 pr-3 pl-5"
                                      }
                                    >
                                      {ex ? (
                                        <Text
                                          maxFontSizeMultiplier={2.5}
                                          className={
                                            error
                                              ? "text-destructive flex-1 text-xl leading-tight"
                                              : "text-foreground flex-1 text-xl leading-tight"
                                          }
                                        >
                                          {ex.name}
                                        </Text>
                                      ) : (
                                        <Text
                                          maxFontSizeMultiplier={2.5}
                                          className={
                                            error
                                              ? "text-destructive flex-1 text-xl leading-tight"
                                              : "text-primary flex-1 text-xl leading-tight"
                                          }
                                        >
                                          Select Exercise
                                        </Text>
                                      )}
                                      <Text
                                        maxFontSizeMultiplier={2.5}
                                        className={
                                          error
                                            ? "text-destructive text-xl"
                                            : "text-muted text-xl"
                                        }
                                      >
                                        <AntDesign name="right" size={15} />
                                      </Text>
                                    </View>
                                  </PressableThemed>
                                </Link>
                                {error && (
                                  <AnimatedViewStyled
                                    entering={FadeInLeft.springify()
                                      .stiffness(40)
                                      .damping(6)
                                      .mass(0.3)}
                                    exiting={FadeOutLeft.springify()
                                      .stiffness(40)
                                      .damping(6)
                                      .mass(0.3)}
                                    pointerEvents="none"
                                    className="absolute bottom-2.5 left-5 z-10"
                                  >
                                    <Text
                                      accessibilityRole="alert"
                                      maxFontSizeMultiplier={2}
                                      className="text-destructive text-sm"
                                    >
                                      Required
                                    </Text>
                                  </AnimatedViewStyled>
                                )}
                              </View>
                            );
                          }}
                        />
                        <PressableThemed
                          className="absolute top-1 left-3 p-2"
                          hitSlop={20}
                          onPress={() => removeActivity(index, item.activityId)}
                          accessibilityLabel="Remove exercise from Session"
                        >
                          <Text
                            maxFontSizeMultiplier={2.5}
                            className="text-destructive text-xl"
                          >
                            <Entypo name="circle-with-minus" size={20} />
                          </Text>
                        </PressableThemed>
                        {index !== 0 && (
                          <PressableThemed
                            className="absolute top-2 self-center p-2 opacity-50"
                            onPress={() => swap(index, index - 1)}
                            accessibilityLabel="Move exercise up"
                          >
                            <Text
                              maxFontSizeMultiplier={2.5}
                              className="text-muted"
                            >
                              <AntDesign name="up" size={15} />
                            </Text>
                          </PressableThemed>
                        )}
                        {index !== fields.length - 1 && (
                          <PressableThemed
                            className="absolute bottom-2 self-center p-2 opacity-50"
                            onPress={() => swap(index, index + 1)}
                            accessibilityLabel="Move exercise down"
                          >
                            <Text
                              maxFontSizeMultiplier={2.5}
                              className="text-muted"
                            >
                              <AntDesign name="down" size={15} />
                            </Text>
                          </PressableThemed>
                        )}
                      </View>
                      <View className="flex-initial basis-1/2 justify-between">
                        <Controller
                          name={`activities.${index}.warmupSets`}
                          control={control}
                          defaultValue={Array.from(Array(3)).map(() => ({
                            workoutSetId: uuidv4(),
                            type: "Warmup" as const,
                            status: "Planned" as const,
                            start: undefined,
                            end: undefined,
                            actualReps: 0,
                            feedback: "Neutral" as const,
                          }))}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInputThemed
                              label="Warmup Sets"
                              stack={{ index: 0, size: 5 }}
                              onChangeText={(v) =>
                                onChange(
                                  numberToWorkoutSetArray<WarmupSet>(
                                    Number(v),
                                    watchActivities[index]?.warmupSets ?? [],
                                    "Warmup",
                                    session,
                                  ),
                                )
                              }
                              onBlur={onBlur}
                              value={
                                value.length ? String(value.length) : undefined
                              }
                              placeholder="0"
                              maxLength={1}
                              cardVariants={activityEditorInputCardVariants}
                              keyboardType="number-pad"
                              selectTextOnFocus
                              numeric
                            />
                          )}
                        />
                        <Controller
                          name={`activities.${index}.mainSets`}
                          control={control}
                          defaultValue={Array.from(Array(3)).map(() => ({
                            workoutSetId: uuidv4(),
                            type: "Main" as const,
                            status: "Planned" as const,
                            start: undefined,
                            end: undefined,
                            actualReps: 0,
                            feedback: "Neutral" as const,
                          }))}
                          rules={{ required: true }}
                          render={({
                            field: { onChange, ref, onBlur, value },
                            fieldState: { error },
                          }) => (
                            <TextInputThemed
                              label="Main Sets"
                              stack={{ index: 1, size: 5 }}
                              onChangeText={(v) =>
                                onChange(
                                  numberToWorkoutSetArray<MainSet>(
                                    Number(v),
                                    watchActivities[index]?.mainSets ?? [],
                                    "Main",
                                    session,
                                  ),
                                )
                              }
                              onBlur={onBlur}
                              value={
                                value.length ? String(value.length) : undefined
                              }
                              innerRef={ref}
                              placeholder="0"
                              maxLength={2}
                              cardVariants={activityEditorInputCardVariants}
                              keyboardType="number-pad"
                              selectTextOnFocus
                              numeric
                              error={error ? "Required" : undefined}
                            />
                          )}
                        />
                        <Controller
                          name={`activities.${index}.reps`}
                          control={control}
                          defaultValue={10}
                          rules={{ required: true, min: 1 }}
                          render={({
                            field: { onChange, ref, onBlur, value },
                            fieldState: { error },
                          }) => (
                            <TextInputThemed
                              label="Repetitions"
                              stack={{ index: 2, size: 5 }}
                              onChangeText={(newValue) => {
                                onChange(
                                  newValue === ""
                                    ? ""
                                    : Number(newValue),
                                );
                              }}
                              onBlur={onBlur}
                              value={String(value)}
                              innerRef={ref}
                              placeholder="0"
                              maxLength={2}
                              cardVariants={activityEditorInputCardVariants}
                              keyboardType="number-pad"
                              selectTextOnFocus
                              numeric
                              error={error ? "Required" : undefined}
                            />
                          )}
                        />
                        <Controller
                          name={`activities.${index}.rest`}
                          control={control}
                          defaultValue={2}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInputThemed
                              label="Rest (minutes)"
                              stack={{ index: 3, size: 5 }}
                              onChangeText={(newValue) => {
                                onChange(Number(newValue));
                              }}
                              onBlur={onBlur}
                              value={String(value)}
                              placeholder="0"
                              maxLength={2}
                              cardVariants={activityEditorInputCardVariants}
                              selectTextOnFocus
                              keyboardType="number-pad"
                              numeric
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          rules={{ required: true }}
                          render={({ field: { value } }) => (
                            <Link
                              href={`/(public)/(app)/load?activityIndex=${index}&activityId=${item.activityId}&exerciseId=${watchActivities[index]?.exerciseId ?? ""}&loadType=${value.type}&loadValue=${value.value}`}
                              asChild
                            >
                              <NavigationCardRow
                                title="Load"
                                trailingText={stringifyLoad(value)}
                                stack={{ index: 4, size: 5 }}
                                cardVariants={["square", "small"]}
                                titleClassName="pr-0"
                                accessibilityLabel="Navigate to select exercise load form"
                              />
                            </Link>
                          )}
                          name={`activities.${index}.load`}
                        />
                      </View>
                    </Card>
                  </Animated.View>
                );
              })}
              <Animated.View
                layout={activityListTransition}
                collapsable={false}
              >
                <PrimaryCardAction
                  label="Add Exercise"
                  icon={<Entypo name="circle-with-plus" size={20} />}
                  onPress={() => {
                    append(
                      {
                        activityId: uuidv4(),
                        exerciseId: "",
                        reps: 10,
                        rest: 2,
                        load: { type: "RPE", value: 8 },
                        warmupSets: Array.from(Array(3)).map(() => ({
                          workoutSetId: uuidv4(),
                          type: "Warmup" as const,
                          status: "Planned" as const,
                          start: undefined,
                          end: undefined,
                          actualReps: 0,
                          feedback: "Neutral" as const,
                        })),
                        mainSets: Array.from(Array(3)).map(() => ({
                          workoutSetId: uuidv4(),
                          type: "Main" as const,
                          status: "Planned" as const,
                          start: undefined,
                          end: undefined,
                          actualReps: 0,
                          feedback: "Neutral" as const,
                        })),
                      },
                      { shouldFocus: false },
                    );
                  }}
                  disabled={fields.length > 100}
                  cardClassName="rounded-none"
                  stack={{
                    size: fields.length + 1,
                    index: fields.length,
                  }}
                />
              </Animated.View>
            </Animated.View>
          </AnimatedViewStyled>
        )}
        {session?.status === "Done" && session.start && (
          <Controller
            name="end"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInputThemed
                label="Elapsed Time (minutes)"
                onChangeText={(newValue) =>
                  onChange(
                    session.start &&
                      add(session.start, { minutes: Number(newValue) }),
                  )
                }
                onBlur={onBlur}
                value={
                  value && session.start
                    ? String(differenceInMinutes(value, session.start))
                    : undefined
                }
                maxLength={3}
                keyboardType="number-pad"
                selectTextOnFocus
                numeric
                cardVariants={["square"]}
              />
            )}
          />
        )}
        {session && (
          <ConfirmButton
            title="Delete Session?"
            message="This will permanently delete this workout session."
            confirmText="Delete Session"
            onConfirm={() => {
              deleteSession(program.programId, session.sessionId);
              router.back();
              router.back();
            }}
            accessibilityLabel={`Delete Workout Session with name ${session.name}`}
            cardVariants={["square"]}
          >
            Delete This Session
          </ConfirmButton>
        )}
        {session?.start && (
          <View>
            <ConfirmButton
              title="Reset Session?"
              message="This will clear the recorded session data and return it to Planned status."
              confirmText="Reset Session"
              onConfirm={() => {
                updateSession(program.programId, {
                  ...session,
                  start: undefined,
                  end: undefined,
                  status: "Planned",
                  activities: session.activities.map((actvy) => ({
                    ...actvy,
                    warmupSets: actvy.warmupSets.map((ws) => ({
                      ...ws,
                      start: undefined,
                      end: undefined,
                      actualReps: 0,
                      status: "Planned" as const,
                    })),
                    mainSets: actvy.mainSets.map((ms) => ({
                      ...ms,
                      start: undefined,
                      end: undefined,
                      actualReps: 0,
                      status: "Planned" as const,
                    })),
                  })),
                });
                router.back();
              }}
              accessibilityLabel={`Reset Workout Session with name ${session.name}`}
              cardVariants={["square"]}
            >
              Reset This Session
            </ConfirmButton>
            <HelperText>
              Resets session to &apos;Planned&apos; state by clearing all
              entered data.
            </HelperText>
          </View>
        )}
      </KeyboardAwareScrollView>
    </>
  );
}
