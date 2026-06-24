import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardExtender,
  useKeyboardState,
} from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { add, subMinutes } from "date-fns";
import _ from "lodash";
import { Controller, useForm, useWatch } from "react-hook-form";
import { twMerge } from "tailwind-merge";

import type { Activity, WarmupSet, WorkoutSet } from "@activity-log/ui/utils";
import {
  recentActivityByExercise,
  round5,
  stringifyLoad,
} from "@activity-log/ui/utils";

import type { WorkoutStore } from "~/hooks/use-workout-store";
import BottomActionBar from "~/components/BottomActionBar";
import { DetailCardRow } from "~/components/CardRow";
import ElapsedTime from "~/components/ElapsedTime";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import PlateChart from "~/components/PlateChart";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import { AnimatedViewStyled } from "~/components/Styled";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

const warmupPercentageMap: Record<number, number[]> = {
  1: [0.6],
  2: [0.4, 0.6],
  3: [0.4, 0.5, 0.6],
  4: [0.4, 0.5, 0.6, 0.7],
  5: [0.3, 0.4, 0.5, 0.6, 0.7],
};

const actionAnimationDuration = 250;

const decimalTextToNumber = (text: string) => {
  if (!text || text === ".") return undefined;

  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

export default function WorkoutSetDetailScreen() {
  const { programId, sessionId, workoutSetId, activityId, title } =
    useLocalSearchParams<{
      programId: string;
      sessionId: string;
      workoutSetId: string;
      activityId: string;
      title: string;
    }>();
  const {
    programs,
    exercises,
    equipment,
    updateWorkoutSet,
    updateExercise,
    startSession,
  } = useWorkoutStore((store) => store);

  const program = programs.find((p) => p.programId === programId);
  const session = program?.sessions.find((s) => s.sessionId === sessionId);
  const activity = session?.activities.find((a) => a.activityId === activityId);
  const exercise = exercises.find((e) => e.exerciseId === activity?.exerciseId);
  const workoutSet =
    activity?.mainSets.find((ws) => ws.workoutSetId === workoutSetId) ??
    activity?.warmupSets.find((ws) => ws.workoutSetId === workoutSetId);

  if (!program || !session || !activity || !exercise || !workoutSet) {
    return <Redirect href="/(public)/(app)" />;
  }

  return (
    <WorkoutSetDetailScreenContent
      title={title}
      program={program}
      session={session}
      activity={activity}
      exercise={exercise}
      workoutSet={workoutSet}
      equipment={equipment}
      updateWorkoutSet={updateWorkoutSet}
      updateExercise={updateExercise}
      startSession={startSession}
    />
  );
}

function WorkoutSetDetailScreenContent({
  title,
  program,
  session,
  activity,
  exercise,
  workoutSet,
  equipment,
  updateWorkoutSet,
  updateExercise,
  startSession,
}: {
  title: string;
  program: WorkoutStore["programs"][number];
  session: WorkoutStore["programs"][number]["sessions"][number];
  activity: Activity;
  exercise: WorkoutStore["exercises"][number];
  workoutSet: WorkoutSet;
  equipment: WorkoutStore["equipment"];
  updateWorkoutSet: WorkoutStore["updateWorkoutSet"];
  updateExercise: WorkoutStore["updateExercise"];
  startSession: WorkoutStore["startSession"];
}) {
  const router = useRouter();

  const warmupPercentages =
    warmupPercentageMap[activity.warmupSets.length] ??
    warmupPercentageMap[5] ??
    [];
  const warmupPercent =
    workoutSet.type === "Warmup"
      ? (warmupPercentages[
          activity.warmupSets.indexOf(workoutSet as WarmupSet)
        ] ??
        _.last(warmupPercentages) ??
        0)
      : 0;
  const workPercent =
    workoutSet.type === "Main" && activity.load.type === "PERCENT"
      ? activity.load.value
      : 0;

  const workoutSetIndex =
    workoutSet.type === "Warmup"
      ? activity.warmupSets.findIndex(
          (ws) => ws.workoutSetId === workoutSet.workoutSetId,
        )
      : activity.mainSets.findIndex(
          (ms) => ms.workoutSetId === workoutSet.workoutSetId,
        );

  const recentActivity = recentActivityByExercise(
    program,
    exercise.exerciseId,
    session,
    activity,
  );
  const setArray =
    recentActivity?.[workoutSet.type === "Warmup" ? "warmupSets" : "mainSets"];
  const similarSet =
    setArray?.[workoutSetIndex] ?? _.last<WorkoutSet>(setArray);
  const weight = similarSet?.actualWeight?.value ?? 0;
  const targetWeight = exercise.oneRepMax
    ? round5(exercise.oneRepMax.value * (warmupPercent || workPercent))
    : weight;
  const defaultActualWeight =
    (workoutSet.actualWeight && workoutSet.actualWeight.value > 0) ||
    workoutSet.status === "Done"
      ? workoutSet.actualWeight
      : { value: targetWeight, unit: "lbs" as const };
  const [actualWeightInput, setActualWeightInput] = useState(
    defaultActualWeight?.value && defaultActualWeight.value > 0
      ? String(defaultActualWeight.value)
      : "",
  );

  const { control, handleSubmit, setValue } = useForm<WorkoutSet>({
    defaultValues: {
      actualWeight: defaultActualWeight,
      actualReps: workoutSet.actualReps ?? 0,
      start: workoutSet.start,
      end: workoutSet.end,
      status: workoutSet.status,
      feedback: workoutSet.feedback,
    },
  });

  const activitySets: WorkoutSet[] = [
    ...activity.warmupSets,
    ...activity.mainSets,
  ];
  const isStartable =
    workoutSet.status === "Planned" &&
    activitySets.find((ws) => ["Planned", "Ready"].includes(ws.status))
      ?.workoutSetId === workoutSet.workoutSetId;

  const onSubmit = useCallback(
    (data: WorkoutSet) => {
      updateWorkoutSet(
        program.programId,
        session.sessionId,
        activity.activityId,
        {
          ...workoutSet,
          actualWeight: data.actualWeight,
          actualReps: data.actualReps,
          start: data.start,
          end:
            data.end &&
            data.start &&
            (subMinutes(data.end, 20).getTime() > data.start.getTime()
              ? add(data.start, { minutes: 20 })
              : data.end),
          status: data.status,
          feedback: data.feedback,
        },
      );
    },
    [
      activity.activityId,
      program.programId,
      session.sessionId,
      updateWorkoutSet,
      workoutSet,
    ],
  );

  const submitCurrentValues = useCallback(() => {
    void handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const actualWeightWatcher = useWatch({ control, name: "actualWeight" });
  const actualRepsWatcher = useWatch({ control, name: "actualReps" });
  const canComplete =
    workoutSet.status === "Ready" && (actualRepsWatcher ?? 0) > 0;
  const [isStartingSet, setIsStartingSet] = useState(false);
  const isActionVisible = !isStartingSet && (isStartable || canComplete);
  const action = isStartingSet
    ? undefined
    : isStartable
      ? "start"
      : canComplete
        ? "complete"
        : undefined;
  const [lastAction, setLastAction] = useState<"start" | "complete">(
    action ?? "complete",
  );
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const [isKeyboardOverlayVisible, setIsKeyboardOverlayVisible] =
    useState(isKeyboardVisible);
  const [shouldRenderAction, setShouldRenderAction] = useState(isActionVisible);
  const actionRenderTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const displayedAction = action ?? lastAction;

  const actionLabel =
    displayedAction === "start"
      ? `Start ${workoutSet.type} Set`
      : `Complete ${workoutSet.type} Set`;
  const actionAccessibilityLabel =
    displayedAction === "start"
      ? `Start ${workoutSet.type.toLowerCase()} set`
      : `Complete ${workoutSet.type.toLowerCase()} set`;

  const onActionPress = () => {
    if (isStartable) {
      setLastAction("start");
      setIsStartingSet(true);
      setValue("start", new Date());
      setValue("status", "Ready");
      submitCurrentValues();
      if (session.status === "Planned") {
        startSession(program.programId, session.sessionId);
      }
      return;
    }

    const now = new Date();
    setLastAction("complete");
    setValue("end", now);
    setValue("status", "Done");
    submitCurrentValues();
    const nextWorkoutSet = activitySets.find(
      (_, index, obj) =>
        obj[index - 1] &&
        obj[index - 1]?.workoutSetId === workoutSet.workoutSetId,
    );
    if (nextWorkoutSet?.status === "Planned") {
      updateWorkoutSet(
        program.programId,
        session.sessionId,
        activity.activityId,
        {
          ...nextWorkoutSet,
          start: now,
          status: "Ready",
        },
      );
    }
    router.back();
  };

  const renderActionBar = () => {
    if (!shouldRenderAction) {
      return null;
    }

    return (
      <BottomActionBar
        label={actionLabel}
        accessibilityLabel={actionAccessibilityLabel}
        visible={isActionVisible}
        onPress={onActionPress}
      />
    );
  };

  const renderKeyboardExtenderAction = () => {
    return (
      <PressableThemed
        accessibilityLabel={actionAccessibilityLabel}
        disabled={!isActionVisible}
        onPress={onActionPress}
        className="h-[53px] items-center justify-center px-10"
      >
        <Text
          maxFontSizeMultiplier={2.5}
          className="text-primary text-center text-xl"
        >
          {actionLabel}
        </Text>
      </PressableThemed>
    );
  };

  useEffect(() => {
    const keyboardWillShowSubscription = Keyboard.addListener(
      "keyboardWillShow",
      () => {
        setIsKeyboardOverlayVisible(true);
      },
    );
    const keyboardDidShowSubscription = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setIsKeyboardOverlayVisible(true);
      },
    );
    const keyboardWillHideSubscription = Keyboard.addListener(
      "keyboardWillHide",
      () => {
        setIsKeyboardOverlayVisible(false);
      },
    );
    const keyboardDidHideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setIsKeyboardOverlayVisible(false);
      },
    );

    return () => {
      keyboardWillShowSubscription.remove();
      keyboardDidShowSubscription.remove();
      keyboardWillHideSubscription.remove();
      keyboardDidHideSubscription.remove();
      if (actionRenderTimeoutRef.current) {
        clearTimeout(actionRenderTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (actionRenderTimeoutRef.current) {
      clearTimeout(actionRenderTimeoutRef.current);
      actionRenderTimeoutRef.current = null;
    }

    if (isActionVisible) {
      if (!shouldRenderAction) {
        actionRenderTimeoutRef.current = setTimeout(() => {
          setShouldRenderAction(true);
          actionRenderTimeoutRef.current = null;
        }, 0);
      }
      return;
    }

    if (shouldRenderAction) {
      actionRenderTimeoutRef.current = setTimeout(() => {
        setShouldRenderAction(false);
        if (isStartingSet) {
          setIsStartingSet(false);
        }
        actionRenderTimeoutRef.current = null;
      }, actionAnimationDuration);
    }
  }, [isActionVisible, isStartingSet, shouldRenderAction]);

  return (
    <>
      <Stack.Screen
        options={{
          title: title,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName={twMerge(
          "px-5 pt-36",
          isKeyboardOverlayVisible ? "pb-18" : "pb-36",
        )}
      >
        <AnimatedViewStyled className="gap-10" layout={LinearTransition}>
          <View>
            <DetailCardRow
              label="Exercise"
              value={exercise.name}
              valueNumberOfLines={3}
              stack={
                workoutSet.type === "Main"
                  ? { index: 0, size: 4 }
                  : exercise.oneRepMax
                    ? { index: 0, size: 2 }
                    : undefined
              }
            />
            {workoutSet.type === "Warmup" && exercise.oneRepMax && (
              <DetailCardRow
                label="Warmup Load"
                value={`${String(warmupPercent * 100)}%${targetWeight && workoutSet.status !== "Done" ? ` / ${targetWeight}lbs` : ""}`}
                stack={{ index: 1, size: 2 }}
              />
            )}
            {workoutSet.type === "Main" && (
              <>
                <DetailCardRow
                  label="Target Load"
                  value={`${stringifyLoad(activity.load)}${activity.load.type === "PERCENT" && targetWeight && workoutSet.status !== "Done" ? ` / ${targetWeight}lbs` : ""}`}
                  stack={{ index: 1, size: 4 }}
                />
                <DetailCardRow
                  label="Target Reps"
                  value={String(activity.reps)}
                  stack={{ index: 2, size: 4 }}
                />
                <DetailCardRow
                  label="Target Rest"
                  value={
                    activity.rest > 0
                      ? `${String(activity.rest)} minutes`
                      : "No rest"
                  }
                  stack={{ index: 3, size: 4 }}
                />
              </>
            )}
            {activity.load.type === "PERCENT" &&
              (!exercise.oneRepMax || exercise.oneRepMax.value <= 0) && (
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-destructive px-3 pt-1.5 text-xl"
                >
                  Setup a One Rep Max for this exercise before using the percent
                  load type.
                </Text>
              )}
          </View>
          {workoutSet.status !== "Planned" && (
            <Animated.View
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
            >
              {workoutSet.type === "Main" &&
                activity.load.type === "RPE" &&
                program.sessions.length < 4 && (
                  <HelperText placement="beforeCard">
                    Find a weight that will meet the target RPE.
                  </HelperText>
                )}
              <Controller
                control={control}
                rules={{ required: true, min: 1, max: 9999 }}
                render={({ field: { onChange, onBlur } }) => {
                  return (
                    <TextInputThemed
                      stack={{ index: 0, size: 3 }}
                      label="Actual Weight (lbs)"
                      onChangeText={(text) => {
                        const numericValue = decimalTextToNumber(text);
                        setActualWeightInput(text);
                        onChange(
                          numericValue != null
                            ? { value: numericValue, unit: "lbs" }
                            : undefined,
                        );
                      }}
                      onBlur={() => {
                        const numericValue =
                          decimalTextToNumber(actualWeightInput);
                        setActualWeightInput(
                          numericValue != null ? String(numericValue) : "",
                        );
                        onBlur();
                        submitCurrentValues();
                      }}
                      value={actualWeightInput || undefined}
                      placeholder="0"
                      maxLength={7}
                      keyboardType="decimal-pad"
                      numeric
                      decimalPlaces={2}
                      selectTextOnFocus
                    />
                  );
                }}
                name="actualWeight"
              />
              <Controller
                control={control}
                rules={{ required: true, min: 1 }}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState,
                }) => {
                  const shouldShowPlaceholder =
                    !fieldState.isDirty && value === 0;

                  return (
                    <TextInputThemed
                      stack={{ index: 1, size: 3 }}
                      label="Actual Reps"
                      onChangeText={(newValue) => {
                        onChange(newValue);
                        setLastAction("complete");
                      }}
                      onBlur={() => {
                        onBlur();
                        submitCurrentValues();
                      }}
                      value={
                        shouldShowPlaceholder
                          ? undefined
                          : value != null
                            ? String(value)
                            : undefined
                      }
                      placeholder="0"
                      maxLength={4}
                      keyboardType="number-pad"
                      numeric
                      selectTextOnFocus
                    />
                  );
                }}
                name="actualReps"
              />
              <ElapsedTime
                stack={{ index: 2, size: 3 }}
                start={workoutSet.start ?? new Date()}
                end={workoutSet.end}
                status={workoutSet.status}
              />
            </Animated.View>
          )}
          {workoutSet.type === "Main" && (
            <Controller
              name="feedback"
              control={control}
              rules={{ required: true }}
              render={({ field: { value } }) => (
                <SegmentedInputThemed
                  label="Difficulty"
                  value={value}
                  accessibilityLabel="Workout set difficulty"
                  options={[
                    {
                      label: "Easy",
                      value: "Easy",
                      accessibilityLabel: "Set workout set feedback: Easy",
                    },
                    {
                      label: "Neutral",
                      value: "Neutral",
                      accessibilityLabel: "Set workout set feedback: Neutral",
                      tone: "muted",
                    },
                    {
                      label: "Hard",
                      value: "Hard",
                      accessibilityLabel: "Set workout set feedback: Hard",
                      tone: "destructive",
                    },
                  ]}
                  onChange={(feedback) => {
                    setValue("feedback", feedback);
                    submitCurrentValues();
                  }}
                />
              )}
            />
          )}
          <MultilineTextInputThemed
            label="Notes"
            value={exercise.notes}
            onChangeText={(notes) => {
              updateExercise({
                ...exercise,
                notes: notes.trim() ? notes : undefined,
              });
            }}
          />
          {actualWeightWatcher?.value ? (
            <PlateChart
              className="mx-5"
              totalWeight={actualWeightWatcher.value}
              equipment={equipment}
            />
          ) : null}
        </AnimatedViewStyled>
      </KeyboardAwareScrollView>
      {shouldRenderAction && !isKeyboardOverlayVisible ? (
        <View
          className="absolute bottom-0 z-10 w-full"
          pointerEvents="box-none"
        >
          {renderActionBar()}
        </View>
      ) : null}
      <View
        className="absolute right-0 bottom-0 left-0 h-0"
        pointerEvents="box-none"
      >
        <KeyboardExtender enabled={shouldRenderAction}>
          {renderKeyboardExtenderAction()}
        </KeyboardExtender>
      </View>
    </>
  );
}
