import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { useNativeVariable } from "react-native-css";
import {
  KeyboardAwareScrollView,
  KeyboardExtender,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";
import { Button, Host } from "@expo/ui";
import {
  accessibilityLabel as accessibilityLabelModifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
} from "@expo/ui/swift-ui/modifiers";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { twMerge } from "tailwind-merge";

import type { Equipment } from "@activity-log/ui/utils";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import type { SavedExercise } from "~/data/repositories/exercises";
import type { SetExecutionContext } from "~/data/repositories/set-context";
import { useApplicationDataSnapshot } from "~/data/react/application-data";
import { useSetContext } from "~/data/react/session-queries";
import { createSetRecordingController } from "~/data/react/set-recording-controller";
import { useEquipment, useExerciseDetail } from "~/data/react/settings-queries";
import BottomActionBar from "./BottomActionBar";
import { DetailCardRow } from "./CardRow";
import DumbbellChart from "./DumbbellChart";
import ElapsedTime from "./ElapsedTime";
import { Text } from "./font-scale-text";
import { HeaderIconAction } from "./HeaderAction";
import MultilineTextInputThemed from "./MultilineTextInputThemed";
import PlateChart from "./PlateChart";
import PressableThemed from "./PressableThemed";
import SegmentedInputThemed from "./SegmentedInputThemed";
import SingleWeightChart from "./SingleWeightChart";
import { SQLiteQueryStatus } from "./sqlite-query-status";
import { AnimatedViewStyled } from "./Styled";
import TextInputThemed from "./TextInputThemed";

function parseInput(text: string): number | null | undefined {
  if (!text.trim()) return null;
  const number = Number(text);
  return text === "." || !Number.isFinite(number) ? undefined : number;
}

export function SQLiteSetScreen({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const params = useLocalSearchParams<{
    programId: string;
    sessionId: string;
    activityId: string;
    workoutSetId: string;
    title?: string;
  }>();
  const snapshot = useApplicationDataSnapshot(runtime);
  const reference = {
    programId: params.programId,
    sessionId: params.sessionId,
    activityId: params.activityId,
    setId: params.workoutSetId,
  };
  const context = useSetContext(runtime, reference);
  const exercise = useExerciseDetail(runtime, context.data?.exercise?.id);
  const equipment = useEquipment(runtime);
  if (
    context.data === undefined ||
    equipment.data === undefined ||
    (context.data?.exercise && exercise.data === undefined)
  )
    return (
      <SQLiteQueryStatus
        error={context.isError || equipment.isError || exercise.isError}
        onRetry={() => {
          void context.refetch();
          void equipment.refetch();
          if (context.data?.exercise) void exercise.refetch();
        }}
      />
    );
  if (!context.data) return <Redirect href="/(public)/(app)" />;
  return (
    <SetEditor
      key={`${snapshot.generation}:${reference.programId}:${reference.sessionId}:${reference.activityId}:${reference.setId}`}
      runtime={runtime}
      generation={snapshot.generation}
      context={context.data}
      exercise={exercise.data ?? null}
      equipment={equipment.data}
      title={params.title ?? "Workout Set"}
    />
  );
}

function SetEditor({
  runtime,
  generation,
  context,
  exercise,
  equipment,
  title,
}: {
  runtime: ApplicationDataRuntime;
  generation: number;
  context: SetExecutionContext;
  exercise: SavedExercise | null;
  equipment: Equipment;
  title: string;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const primaryColor = useNativeVariable("--primary") as string;
  const foregroundColor = useNativeVariable("--foreground") as string;
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const [isKeyboardOverlayVisible, setIsKeyboardOverlayVisible] =
    useState(isKeyboardVisible);
  const [controller] = useState(() =>
    createSetRecordingController(
      runtime.getSnapshot().service,
      context.reference,
      context.exercise?.id ?? null,
    ),
  );
  const initialWeight =
    context.set.weightValue !== null &&
    (context.set.weightValue > 0 || context.set.status === "Done")
      ? {
          value: context.set.weightValue,
          unit: context.set.weightUnit ?? "lbs",
        }
      : context.targetWeight;
  const [weightInput, setWeightInput] = useState(
    initialWeight && initialWeight.value > 0 ? String(initialWeight.value) : "",
  );
  const [repsInput, setRepsInput] = useState(
    context.set.actualReps && context.set.actualReps > 0
      ? String(context.set.actualReps)
      : "",
  );
  const [feedback, setFeedback] = useState(context.set.feedback);
  const [notes, setNotes] = useState(exercise?.notes ?? "");
  const [fallbackStart] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const weightRef = useRef(weightInput);
  const repsRef = useRef(repsInput);
  const unitRef = useRef<"lbs" | "kg">(initialWeight?.unit ?? "lbs");
  const feedbackRef = useRef(feedback);
  const actionRef = useRef(false);
  const removalRef = useRef(false);
  const allowRemoval = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () =>
    mounted.current && runtime.getSnapshot().generation === generation;
  const flush = async () => {
    if (
      parseInput(weightRef.current) === undefined ||
      parseInput(repsRef.current) === undefined
    )
      throw new Error("Enter valid numbers before leaving this set.");
    await controller.flush();
  };
  const errorAlert = (error: unknown) =>
    Alert.alert(
      "Workout Not Saved",
      error instanceof Error
        ? error.message
        : "The workout changes could not be saved. Your inputs are still here.",
    );
  const flushAndReconcile = async () => {
    await flush();
    if (
      context.session.status === "Done" ||
      context.session.status === "Incomplete"
    )
      await runtime
        .getSnapshot()
        .service.reconcileSet(
          context.reference,
          parseInput(repsRef.current) ?? null,
        );
  };
  usePreventRemove(true, ({ data }) => {
    if (allowRemoval.current) {
      allowRemoval.current = false;
      navigation.dispatch(data.action);
      return;
    }
    if (removalRef.current || actionRef.current) return;
    removalRef.current = true;
    setPending(true);
    void flushAndReconcile()
      .then(() => {
        if (current()) {
          allowRemoval.current = true;
          navigation.dispatch(data.action);
        }
      })
      .catch((error: unknown) => {
        if (current()) errorAlert(error);
      })
      .finally(() => {
        removalRef.current = false;
        if (current()) setPending(false);
      });
  });
  const navigate = async (route: "insights" | "exercise") => {
    if (actionRef.current || !current()) return;
    actionRef.current = true;
    setPending(true);
    try {
      await flush();
      if (!current()) return;
      Keyboard.dismiss();
      if (route === "insights")
        router.push(
          `/(public)/(app)/program/${encodeURIComponent(context.reference.programId)}/session/${encodeURIComponent(context.reference.sessionId)}/set/insights?activityId=${encodeURIComponent(context.reference.activityId)}&workoutSetId=${encodeURIComponent(context.reference.setId)}`,
        );
      else if (context.exercise)
        router.push(
          `/(public)/(app)/exercise/form?exerciseId=${encodeURIComponent(context.exercise.id)}`,
        );
    } catch (error) {
      if (current()) errorAlert(error);
    } finally {
      actionRef.current = false;
      if (current()) setPending(false);
    }
  };
  const actual = parseInput(repsInput);
  const canComplete =
    context.session.status === "Ready" &&
    context.set.status === "Ready" &&
    actual !== null &&
    actual !== undefined &&
    actual > 0;
  const action = context.isStartable
    ? "start"
    : canComplete
      ? "complete"
      : null;
  const isActionVisible = !!action && !pending;
  const [lastAction, setLastAction] = useState<"start" | "complete">(
    action ?? "complete",
  );
  const [shouldRenderAction, setShouldRenderAction] = useState(isActionVisible);
  const displayedAction = action ?? lastAction;
  const actionLabel = `${displayedAction === "start" ? "Start" : "Complete"} ${context.set.kind} Set`;
  const actionAccessibilityLabel = `${displayedAction === "start" ? "Start" : "Complete"} ${context.set.kind.toLowerCase()} set`;
  useEffect(() => {
    if (action) setLastAction(action);
  }, [action]);
  useEffect(() => {
    const listeners = [
      "keyboardWillShow",
      "keyboardDidShow",
      "keyboardWillHide",
      "keyboardDidHide",
    ].map((event) =>
      Keyboard.addListener(event as "keyboardWillShow", () =>
        setIsKeyboardOverlayVisible(event.endsWith("Show")),
      ),
    );
    return () => listeners.forEach((listener) => listener.remove());
  }, []);
  useEffect(() => {
    if (isActionVisible) {
      setShouldRenderAction(true);
      return;
    }
    const timeout = setTimeout(() => setShouldRenderAction(false), 250);
    return () => clearTimeout(timeout);
  }, [isActionVisible]);
  const dismissKeyboard = () => {
    RNTextInput.State.blurTextInput(RNTextInput.State.currentlyFocusedInput());
    Keyboard.dismiss();
  };
  const dismissKeyboardBeforePop = async () => {
    if (!isKeyboardVisible && !isKeyboardOverlayVisible) {
      dismissKeyboard();
      return;
    }
    await new Promise<void>((resolve) => {
      const subscription = Keyboard.addListener("keyboardWillHide", () => {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      });
      const timeout = setTimeout(() => {
        subscription.remove();
        resolve();
      }, 100);
      dismissKeyboard();
    });
  };
  const runAction = async () => {
    if (!action || actionRef.current || !current()) return;
    actionRef.current = true;
    setPending(true);
    try {
      await flush();
      const reps = parseInput(repsRef.current);
      const weight = parseInput(weightRef.current);
      if (reps === undefined || weight === undefined)
        throw new Error("Enter valid numbers before continuing.");
      const measurements = {
        actualReps: reps,
        weight:
          weight === null ? null : { value: weight, unit: unitRef.current },
        feedback: feedbackRef.current,
      };
      if (action === "start")
        await runtime
          .getSnapshot()
          .service.startSet(context.reference, measurements);
      else
        await runtime
          .getSnapshot()
          .service.completeSet(context.reference, measurements);
      if (current() && action === "complete") {
        await dismissKeyboardBeforePop();
        if (!current()) return;
        allowRemoval.current = true;
        router.back();
      }
    } catch (error) {
      if (current()) errorAlert(error);
    } finally {
      actionRef.current = false;
      if (current()) setPending(false);
    }
  };
  const displayWeight = parseInput(weightInput);
  const barbell = equipment.barbells.find(
    (item) => item.barbellId === context.exercise?.barbellId,
  );
  const loadText =
    context.activity.loadType === null || context.activity.loadValue === null
      ? "Unavailable"
      : context.activity.loadType === "PERCENT"
        ? `${Number((context.activity.loadValue * 100).toFixed(2))}%`
        : `RPE ${context.activity.loadValue}`;
  const isMain = context.set.kind === "Main";
  const showTarget = isMain || context.firstMainSet !== null;
  const targetSummarySize = isMain ? 4 : showTarget ? 3 : 1;
  const displayedTarget = isMain
    ? context.targetWeight
    : context.mainTargetWeight;
  const referenceSet = isMain ? context.set : context.firstMainSet;
  const rpeWeight = isMain
    ? initialWeight
    : referenceSet?.weightValue !== null &&
        referenceSet?.weightValue !== undefined &&
        referenceSet.weightUnit
      ? { value: referenceSet.weightValue, unit: referenceSet.weightUnit }
      : null;
  const targetLoad = `${loadText}${context.activity.loadType === "PERCENT" && displayedTarget?.value && referenceSet?.status !== "Done" ? ` / ${displayedTarget.value}${displayedTarget.unit}` : ""}${context.activity.loadType === "RPE" && rpeWeight ? ` / ${rpeWeight.value}${rpeWeight.unit}` : ""}`;
  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerBackButtonDisplayMode: "minimal",
          ...(Platform.OS === "ios" && { headerBackVisible: false }),
        }}
      />
      {Platform.OS === "ios" && router.canGoBack() && (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="chevron.left"
            tintColor={foregroundColor}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        </Stack.Toolbar>
      )}
      <Stack.Toolbar placement="right">
        {context.hasTemplateHistory && context.exercise && (
          <Stack.Toolbar.View>
            <HeaderIconAction
              className="rounded-full"
              accessibilityLabel={`View insights for ${context.exercise.name}`}
              onPress={() => void navigate("insights")}
            >
              <Text maxFontSizeMultiplier={2.5} className="text-primary">
                <MaterialCommunityIcons
                  name="chart-timeline-variant-shimmer"
                  size={24}
                />
              </Text>
            </HeaderIconAction>
          </Stack.Toolbar.View>
        )}
        {isKeyboardOverlayVisible &&
          (Platform.OS === "ios" ? (
            <Stack.Toolbar.Button
              icon="checkmark"
              variant="done"
              tintColor={primaryColor}
              separateBackground
              accessibilityLabel="Dismiss keyboard"
              onPress={dismissKeyboard}
            />
          ) : (
            <Stack.Toolbar.View>
              <HeaderIconAction
                className="bg-primary rounded-full"
                accessibilityLabel="Dismiss keyboard"
                onPress={dismissKeyboard}
              >
                <MaterialCommunityIcons name="check" size={24} color="white" />
              </HeaderIconAction>
            </Stack.Toolbar.View>
          ))}
      </Stack.Toolbar>
      <KeyboardAwareScrollView
        pointerEvents={pending ? "none" : "auto"}
        bottomOffset={Platform.OS === "ios" && shouldRenderAction ? 86 : 30}
        className="flex-1"
        contentContainerClassName={twMerge(
          "px-5 pt-5",
          isKeyboardOverlayVisible ? "pb-18" : "pb-36",
        )}
        contentInsetAdjustmentBehavior="automatic"
      >
        <AnimatedViewStyled className="gap-10" layout={LinearTransition}>
          <View>
            <DetailCardRow
              label="Exercise"
              value={
                context.exercise
                  ? `${context.exercise.name}${context.exercise.deleted ? " (Deleted)" : ""}`
                  : "Unavailable exercise"
              }
              cardVariants={["multiline"]}
              trailingAccessory={
                context.exercise ? (
                  <PressableThemed
                    className="-mt-3 -mr-3 -mb-3 h-11 w-11 items-center justify-center"
                    accessibilityLabel={`Edit exercise ${context.exercise.name}`}
                    onPress={() => void navigate("exercise")}
                  >
                    <Text maxFontSizeMultiplier={2.5} className="text-primary">
                      <MaterialCommunityIcons
                        name="information-variant-circle-outline"
                        size={22}
                      />
                    </Text>
                  </PressableThemed>
                ) : undefined
              }
              stack={
                targetSummarySize > 1
                  ? { index: 0, size: targetSummarySize }
                  : undefined
              }
            />
            {showTarget && (
              <DetailCardRow
                label={isMain ? "Target Load" : "Target Load (Main)"}
                value={targetLoad}
                stack={{ index: 1, size: targetSummarySize }}
              />
            )}
            {showTarget && (
              <DetailCardRow
                label={isMain ? "Target Reps" : "Target Reps (Main)"}
                value={
                  context.activity.reps === null
                    ? "Unavailable"
                    : String(context.activity.reps)
                }
                stack={{ index: 2, size: targetSummarySize }}
              />
            )}
            {isMain && (
              <DetailCardRow
                label="Target Rest"
                value={
                  context.activity.restMinutes === null
                    ? "Unavailable"
                    : context.activity.restMinutes > 0
                      ? `${context.activity.restMinutes} minutes`
                      : "No rest"
                }
                stack={{ index: 3, size: 4 }}
              />
            )}
            {context.activity.loadType === "PERCENT" &&
              (!context.exercise?.oneRepMax ||
                context.exercise.oneRepMax.value <= 0) && (
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-destructive px-3 pt-1.5 text-xl"
                >
                  Setup a One Rep Max for this exercise before using the percent
                  load type.
                </Text>
              )}
          </View>
          {context.set.status !== "Planned" && (
            <Animated.View
              entering={FadeInUp.duration(250)}
              exiting={FadeOutDown.duration(250)}
            >
              <TextInputThemed
                stack={{ index: 0, size: 3 }}
                label={
                  context.exercise?.loadKind === "WEIGHT_PAIR"
                    ? `Weight Each (${unitRef.current})`
                    : `Weight (${unitRef.current})`
                }
                value={weightInput}
                keyboardType="decimal-pad"
                numeric
                decimalPlaces={2}
                maxLength={7}
                placeholder="0"
                selectTextOnFocus
                onChangeText={(text) => {
                  weightRef.current = text;
                  setWeightInput(text);
                  const value = parseInput(text);
                  if (value !== undefined) {
                    controller.change({
                      weight:
                        value === null
                          ? null
                          : { value, unit: unitRef.current },
                    });
                  }
                }}
                onBlur={() =>
                  void controller.flush().catch((error: unknown) => {
                    if (current()) errorAlert(error);
                  })
                }
              />
              <TextInputThemed
                stack={{ index: 1, size: 3 }}
                label="Actual Reps"
                value={repsInput}
                keyboardType="number-pad"
                numeric
                maxLength={4}
                placeholder="0"
                selectTextOnFocus
                onChangeText={(text) => {
                  repsRef.current = text;
                  setRepsInput(text);
                  const value = parseInput(text);
                  if (value !== undefined)
                    controller.change({ actualReps: value });
                }}
                onBlur={() =>
                  void controller.flush().catch((error: unknown) => {
                    if (current()) errorAlert(error);
                  })
                }
              />
              <ElapsedTime
                stack={{ index: 2, size: 3 }}
                start={new Date(context.set.startMs ?? fallbackStart)}
                end={
                  context.set.endMs === null
                    ? undefined
                    : new Date(context.set.endMs)
                }
                status={context.set.status}
              />
            </Animated.View>
          )}
          {context.set.kind === "Main" && (
            <Animated.View
              layout={LinearTransition.duration(250)
                .springify()
                .stiffness(50)
                .damping(6)
                .mass(0.3)}
            >
              <SegmentedInputThemed
                label="Difficulty"
                value={feedback}
                accessibilityLabel="Workout set difficulty"
                options={[
                  { label: "Easy", value: "Easy", tone: "info" },
                  { label: "Neutral", value: "Neutral", tone: "muted" },
                  { label: "Hard", value: "Hard", tone: "primary" },
                ]}
                onChange={(value) => {
                  feedbackRef.current = value;
                  setFeedback(value);
                  controller.change({ feedback: value });
                }}
              />
            </Animated.View>
          )}
          {context.exercise && (
            <Animated.View
              layout={LinearTransition.duration(250)
                .springify()
                .stiffness(50)
                .damping(6)
                .mass(0.3)}
            >
              <MultilineTextInputThemed
                label="Notes"
                value={notes}
                onChangeText={(text) => {
                  setNotes(text);
                  controller.changeNotes(text.trim() ? text : null);
                }}
              />
            </Animated.View>
          )}
          <Animated.View
            layout={LinearTransition.duration(250)
              .springify()
              .stiffness(50)
              .damping(6)
              .mass(0.3)}
          >
            {displayWeight !== null &&
              displayWeight !== undefined &&
              displayWeight > 0 &&
              context.exercise?.loadKind === "BARBELL" &&
              barbell?.unit === unitRef.current && (
                <PlateChart
                  className="mx-5"
                  totalWeight={displayWeight}
                  equipment={{
                    barbells: equipment.barbells.filter(
                      (item) => item.unit === unitRef.current,
                    ),
                    plates: equipment.plates.filter(
                      (item) => item.unit === unitRef.current,
                    ),
                  }}
                  barbell={barbell}
                />
              )}
          </Animated.View>
          {displayWeight !== null &&
            displayWeight !== undefined &&
            displayWeight > 0 &&
            context.exercise?.loadKind === "WEIGHT_PAIR" && (
              <DumbbellChart
                className="mx-5"
                weight={displayWeight}
                unit={unitRef.current}
              />
            )}
          {displayWeight !== null &&
            displayWeight !== undefined &&
            displayWeight > 0 &&
            context.exercise?.loadKind === "SINGLE_WEIGHT" && (
              <SingleWeightChart
                className="mx-5"
                weight={displayWeight}
                unit={unitRef.current}
              />
            )}
        </AnimatedViewStyled>
      </KeyboardAwareScrollView>
      <BottomActionBar
        label={actionLabel}
        accessibilityLabel={actionAccessibilityLabel}
        hidden={!isActionVisible || isKeyboardOverlayVisible}
        onPress={() => void runAction()}
      />
      {Platform.OS === "ios" ? (
        shouldRenderAction && (
          <KeyboardStickyView
            pointerEvents={
              isKeyboardOverlayVisible && isActionVisible ? "box-none" : "none"
            }
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 10,
              opacity: isKeyboardOverlayVisible && isActionVisible ? 1 : 0,
            }}
          >
            <View
              style={{
                height: 72,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Host matchContents ignoreSafeArea="all" seedColor={primaryColor}>
                <Button
                  label={actionLabel}
                  disabled={!isActionVisible}
                  onPress={() => void runAction()}
                  modifiers={[
                    accessibilityLabelModifier(actionAccessibilityLabel),
                    buttonBorderShape("capsule"),
                    buttonStyle("glass"),
                    controlSize("large"),
                    font({ weight: "medium" }),
                  ]}
                />
              </Host>
            </View>
          </KeyboardStickyView>
        )
      ) : (
        <View
          className="absolute right-0 bottom-0 left-0 h-0"
          pointerEvents="box-none"
        >
          <KeyboardExtender enabled={shouldRenderAction}>
            <PressableThemed
              accessibilityLabel={actionAccessibilityLabel}
              disabled={!isActionVisible}
              onPress={() => void runAction()}
              className="h-[48px] items-center justify-center"
            >
              <Text
                maxFontSizeMultiplier={2.5}
                className="text-primary text-center text-xl font-semibold"
              >
                {actionLabel}
              </Text>
            </PressableThemed>
          </KeyboardExtender>
        </View>
      )}
    </>
  );
}
