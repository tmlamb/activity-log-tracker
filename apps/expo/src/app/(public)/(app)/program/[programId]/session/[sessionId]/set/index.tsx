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
import { Stack, useLocalSearchParams } from "expo-router";
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

import type { SavedExercise } from "~/data/repositories/exercises";
import type { SetExecutionContext } from "~/data/repositories/set-context";
import BottomActionBar from "~/components/BottomActionBar";
import { DetailCardRow } from "~/components/CardRow";
import { CollapsibleSection } from "~/components/CollapsibleSection";
import ConfirmButton from "~/components/ConfirmButton";
import DumbbellChart from "~/components/DumbbellChart";
import ElapsedTime from "~/components/ElapsedTime";
import { Text } from "~/components/font-scale-text";
import { headerIcons } from "~/components/header-toolbar";
import { HeaderIconAction } from "~/components/HeaderAction";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import PlateChart from "~/components/PlateChart";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import SingleWeightChart from "~/components/SingleWeightChart";
import { AnimatedViewStyled } from "~/components/Styled";
import TextInputThemed from "~/components/TextInputThemed";
import {
  completeSet,
  patchSet,
  reconcileSet,
  resetSet,
  setExerciseNotes,
  startSet,
} from "~/data/actions";
import { DEFAULT_DROP_PERCENT } from "~/data/domain/set-execution";
import { useEquipment, useExerciseDetail, useSetContext } from "~/data/queries";
import useRouter from "~/hooks/use-router";

/** Presses of the start/complete button closer together than this are one. */
const ACTION_DOUBLE_PRESS_MS = 800;

function parseInput(text: string): number | null | undefined {
  if (!text.trim()) return null;
  const number = Number(text);
  return text === "." || !Number.isFinite(number) ? undefined : number;
}

export default function WorkoutSetDetailScreen() {
  const params = useLocalSearchParams<{
    programId: string;
    sessionId: string;
    activityId: string;
    workoutSetId: string;
    title?: string;
  }>();
  const reference = {
    programId: params.programId,
    sessionId: params.sessionId,
    activityId: params.activityId,
    setId: params.workoutSetId,
  };
  const context = useSetContext(reference);
  const exercise = useExerciseDetail(context?.exercise?.id);
  const equipment = useEquipment();
  if (!context) return <MissingDataRedirect />;
  return (
    <SetEditor
      key={`${reference.programId}:${reference.sessionId}:${reference.activityId}:${reference.setId}`}
      context={context}
      exercise={exercise}
      equipment={equipment}
      title={params.title ?? "Workout Set"}
    />
  );
}

function SetEditor({
  context,
  exercise,
  equipment,
  title,
}: {
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
  // Edited here and in the exercise form this screen links to: follow a change
  // made there, but not this screen's own edits, which are saved as typed.
  const storedNotes = exercise?.notes ?? "";
  const [notes, setNotes] = useState(storedNotes);
  const [seenNotes, setSeenNotes] = useState(storedNotes);
  if (seenNotes !== storedNotes) {
    setSeenNotes(storedNotes);
    if ((notes.trim() ? notes : "") !== storedNotes) setNotes(storedNotes);
  }
  const [fallbackStart] = useState(Date.now);
  const [unit, setUnit] = useState<"lbs" | "kg">(initialWeight?.unit ?? "lbs");
  // The target follows the exercise's one rep max, which may be set in the
  // exercise form this screen links to. Keep an untouched weight on target.
  const { targetWeight } = context;
  const targetInput =
    targetWeight && targetWeight.value > 0 ? String(targetWeight.value) : "";
  const targetUnit = targetWeight?.unit;
  const [seenTarget, setSeenTarget] = useState({
    input: targetInput,
    unit: targetUnit,
  });
  if (seenTarget.input !== targetInput || seenTarget.unit !== targetUnit) {
    setSeenTarget({ input: targetInput, unit: targetUnit });
    if (
      context.set.status !== "Done" &&
      !((context.set.weightValue ?? 0) > 0) &&
      weightInput === seenTarget.input
    ) {
      setWeightInput(targetInput);
      if (targetUnit) setUnit(targetUnit);
    }
  }
  const [advancedCollapsed, setAdvancedCollapsed] = useState(true);
  const leavingRef = useRef(false);
  const allowRemoval = useRef(false);
  const validateInputs = (before = "leaving this set") => {
    if (
      parseInput(weightInput) === undefined ||
      parseInput(repsInput) === undefined
    )
      throw new Error(`Enter valid numbers before ${before}.`);
  };
  const errorAlert = (error: unknown) =>
    Alert.alert(
      "Workout Not Saved",
      error instanceof Error
        ? error.message
        : "The workout changes could not be saved. Your inputs are still here.",
    );
  const savePatch = (patch: Parameters<typeof patchSet>[1]) => {
    try {
      patchSet(context.reference, patch);
    } catch (error) {
      errorAlert(error);
    }
  };
  usePreventRemove(true, ({ data }) => {
    if (allowRemoval.current) {
      allowRemoval.current = false;
      navigation.dispatch(data.action);
      return;
    }
    if (leavingRef.current) return;
    try {
      validateInputs();
      if (
        context.session.status === "Done" ||
        context.session.status === "Incomplete"
      )
        reconcileSet(context.reference, parseInput(repsInput) ?? null);
    } catch (error) {
      errorAlert(error);
      return;
    }
    allowRemoval.current = true;
    navigation.dispatch(data.action);
  });
  const navigate = (route: "insights" | "exercise") => {
    try {
      validateInputs();
    } catch (error) {
      errorAlert(error);
      return;
    }
    Keyboard.dismiss();
    if (route === "insights")
      router.push(
        `/(public)/(app)/program/${encodeURIComponent(context.reference.programId)}/session/${encodeURIComponent(context.reference.sessionId)}/set/insights?activityId=${encodeURIComponent(context.reference.activityId)}&workoutSetId=${encodeURIComponent(context.reference.setId)}`,
      );
    else if (context.exercise)
      router.push(
        `/(public)/(app)/exercise/form?exerciseId=${encodeURIComponent(context.exercise.id)}`,
      );
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
  const isActionVisible = !!action;
  const [lastAction, setLastAction] = useState<"start" | "complete">(
    action ?? "complete",
  );
  const [shouldRenderAction, setShouldRenderAction] = useState(isActionVisible);
  if (action && action !== lastAction) setLastAction(action);
  if (isActionVisible && !shouldRenderAction) setShouldRenderAction(true);
  const displayedAction = action ?? lastAction;
  const actionLabel = `${displayedAction === "start" ? "Start" : "Complete"} ${context.set.kind} Set`;
  const actionAccessibilityLabel = `${displayedAction === "start" ? "Start" : "Complete"} ${context.set.kind.toLowerCase()} set`;
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
    if (isActionVisible) return;
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
  const lastActionAt = useRef(0);
  const runAction = async () => {
    if (!action || leavingRef.current) return;
    // Starting a set with reps already entered makes Complete the next action
    // on the same button; a quick second tap mustn't complete it too.
    const now = Date.now();
    if (now - lastActionAt.current < ACTION_DOUBLE_PRESS_MS) return;
    lastActionAt.current = now;
    try {
      validateInputs("continuing");
      const reps = parseInput(repsInput) ?? null;
      const weight = parseInput(weightInput) ?? null;
      const measurements = {
        actualReps: reps,
        weight: weight === null ? null : { value: weight, unit: unit },
        feedback,
      };
      if (action === "start") startSet(context.reference, measurements);
      else completeSet(context.reference, measurements);
    } catch (error) {
      errorAlert(error);
      return;
    }
    if (action !== "complete") return;
    leavingRef.current = true;
    await dismissKeyboardBeforePop();
    allowRemoval.current = true;
    router.back();
  };
  // A done or running set in a session still in progress can be redone.
  const canReset =
    context.session.status === "Ready" &&
    (context.set.status === "Done" ||
      (context.set.status === "Ready" && context.set.startMs !== null));
  const reset = () => {
    try {
      resetSet(context.reference);
    } catch (error) {
      errorAlert(error);
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
  const isDrop = context.set.kind === "Drop";
  const showTarget = !isDrop && (isMain || context.firstMainSet !== null);
  const targetSummarySize = isMain ? 4 : isDrop ? 2 : showTarget ? 3 : 1;
  const dropLoad = `${Number(((context.activity.dropPercent ?? DEFAULT_DROP_PERCENT) * 100).toFixed(2))}% Drop${context.targetWeight?.value && context.set.status !== "Done" ? ` / ${context.targetWeight.value}${context.targetWeight.unit}` : ""}`;
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
          <Stack.Toolbar.Button
            icon={headerIcons.insights}
            tintColor={primaryColor}
            accessibilityLabel={`View insights for ${context.exercise.name}`}
            onPress={() => navigate("insights")}
          />
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
        bottomOffset={Platform.OS === "ios" && shouldRenderAction ? 86 : 30}
        className="flex-1"
        contentContainerClassName={twMerge(
          "px-5 pt-5",
          isKeyboardOverlayVisible ? "pb-18" : "pb-36",
        )}
        contentInsetAdjustmentBehavior="automatic"
        mode="layout"
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
                    onPress={() => navigate("exercise")}
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
            {isDrop && (
              <DetailCardRow
                label="Target Load"
                value={dropLoad}
                stack={{ index: 1, size: targetSummarySize }}
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
                    ? `Weight Each (${unit})`
                    : `Weight (${unit})`
                }
                value={weightInput}
                keyboardType="decimal-pad"
                numeric
                decimalPlaces={2}
                maxLength={7}
                placeholder="0"
                selectTextOnFocus
                onChangeText={(text) => {
                  setWeightInput(text);
                  const value = parseInput(text);
                  if (value !== undefined) {
                    savePatch({
                      weight: value === null ? null : { value, unit: unit },
                    });
                  }
                }}
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
                  setRepsInput(text);
                  const value = parseInput(text);
                  if (value !== undefined) savePatch({ actualReps: value });
                }}
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
                  setFeedback(value);
                  savePatch({ feedback: value });
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
                  if (!context.exercise) return;
                  try {
                    setExerciseNotes(
                      context.exercise.id,
                      text.trim() ? text : null,
                    );
                  } catch (error) {
                    errorAlert(error);
                  }
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
              barbell?.unit === unit && (
                <PlateChart
                  className="mx-5"
                  totalWeight={displayWeight}
                  equipment={{
                    barbells: equipment.barbells.filter(
                      (item) => item.unit === unit,
                    ),
                    plates: equipment.plates.filter(
                      (item) => item.unit === unit,
                    ),
                  }}
                  barbell={barbell}
                />
              )}
            {displayWeight !== null &&
              displayWeight !== undefined &&
              displayWeight > 0 &&
              context.exercise?.loadKind === "WEIGHT_PAIR" && (
                <DumbbellChart
                  className="mx-5"
                  weight={displayWeight}
                  unit={unit}
                />
              )}
            {displayWeight !== null &&
              displayWeight !== undefined &&
              displayWeight > 0 &&
              context.exercise?.loadKind === "SINGLE_WEIGHT" && (
                <SingleWeightChart
                  className="mx-5"
                  weight={displayWeight}
                  unit={unit}
                />
              )}
          </Animated.View>
          {canReset && (
            <Animated.View
              entering={FadeInUp.duration(250)}
              exiting={FadeOutDown.duration(250)}
            >
              <CollapsibleSection
                title="Advanced"
                collapsed={advancedCollapsed}
                onCollapsedChange={setAdvancedCollapsed}
              >
                <ConfirmButton
                  title="Reset Set?"
                  message="This set and any later sets of this exercise that are done or in progress will return to not started. Entered reps and weight are kept."
                  confirmText="Reset Set"
                  accessibilityLabel={`Reset ${title}`}
                  onConfirm={reset}
                >
                  Reset This Set
                </ConfirmButton>
              </CollapsibleSection>
            </Animated.View>
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
