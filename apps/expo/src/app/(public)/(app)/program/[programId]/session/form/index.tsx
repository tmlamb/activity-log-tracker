import "react-native-get-random-values";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { AntDesign, Entypo, Feather } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";

import type {
  SessionDraft,
  TemplateSource,
} from "~/data/repositories/session-drafts";
import type {
  SessionEditorExercise,
  SessionEditorSeed,
} from "~/data/repositories/session-editor";
import type { SelectionKind, SelectionTicket } from "~/data/selection-handoff";
import Card from "~/components/Card";
import { NavigationCardRow, PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import DateTimeInputThemed from "~/components/DateTimeInputThemed";
import { Text } from "~/components/font-scale-text";
import { HeaderTextAction } from "~/components/HeaderAction";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import { AnimatedViewStyled } from "~/components/Styled";
import SwitchThemed from "~/components/SwitchThemed";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText } from "~/components/Typography";
import {
  createSession,
  deleteSession,
  resetSession,
  saveAndCompleteSession,
  saveSession,
} from "~/data/actions";
import {
  draftFromSession,
  newDraftActivity,
  newDraftSet,
  shiftDraftStart,
} from "~/data/domain/session-editor-draft";
import { useProgramSummaries, useSessionEditorSeed } from "~/data/queries";
import { getSavedExercise } from "~/data/repositories/exercises";
import { getPlanningWeightHints } from "~/data/repositories/planning-weights";
import { getSessionEditorSeed } from "~/data/repositories/session-editor";
import { createTemplateDraft } from "~/data/repositories/template-draft";
import { resolveTemplateChoice } from "~/data/repositories/templates";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { read, useGeneration } from "~/data/store";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

export default function SessionFormScreen() {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId?: string;
  }>();
  const seed = useSessionEditorSeed(programId, sessionId ?? null);
  const programs = useProgramSummaries();
  const program = programs.find((item) => item.id === programId);
  if (!seed || !program) return <Redirect href="/(public)/(app)" />;
  return (
    <SessionEditor
      key={`${programId}:${sessionId ?? "new"}`}
      seed={seed}
      sessionCount={program.sessionCount}
    />
  );
}

function NumberDraftInput({
  label,
  value,
  onChange,
  maxLength = 3,
  stack,
  compact = false,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  maxLength?: number;
  stack?: { index: number; size: number };
  compact?: boolean;
  error?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <TextInputThemed
      label={label}
      value={text}
      keyboardType="number-pad"
      numeric
      maxLength={maxLength}
      stack={stack}
      error={error}
      placeholder="0"
      selectTextOnFocus
      cardVariants={compact ? ["square", "small", "transparent"] : ["square"]}
      onChangeText={(next) => {
        setText(next);
        const parsed = next.trim() ? Number(next) : NaN;
        onChange(Number.isFinite(parsed) ? parsed : null);
      }}
      onBlur={() => {
        const parsed = text.trim() ? Number(text) : NaN;
        setText(Number.isFinite(parsed) ? String(parsed) : "");
      }}
    />
  );
}

function SessionEditor({
  seed,
  sessionCount,
}: {
  seed: SessionEditorSeed;
  sessionCount: number;
}) {
  const router = useRouter();
  const focused = useIsFocused();
  const [initial] = useState(() => seed);
  const [ownerId] = useState(() => uuidv4());
  const [newSessionId] = useState(() => uuidv4());
  const [initialDraft] = useState<SessionDraft>(() =>
    initial.session
      ? draftFromSession(initial.session)
      : { name: "", deload: false, startMs: null, endMs: null, activities: [] },
  );
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(initialDraft);
  const [exercises, setExercises] = useState<
    Record<string, SessionEditorExercise>
  >(() => Object.fromEntries(initial.exercises.map((item) => [item.id, item])));
  const [template, setTemplate] = useState<TemplateSource | null>(null);
  const [fromType, setFromType] = useState<"Scratch" | "Template">();
  const templateRef = useRef<TemplateSource | null>(null);
  const [renameLineage, setRenameLineage] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const activeTicket = useRef<{
    ticket: SelectionTicket;
    kind: SelectionKind;
  } | null>(null);
  const sawBlur = useRef(false);
  const entries = useSelectionHandoff((state) => state.entries);
  const generation = useGeneration();
  const session = initial.session;
  const terminal =
    session?.status === "Done" || session?.status === "Incomplete";
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initialDraft) || template !== null;
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(dirty);
  const updateDraft = (next: SessionDraft) => {
    draftRef.current = next;
    setDraft(next);
  };
  const updateActivity = (
    id: string,
    update: (
      activity: SessionDraft["activities"][number],
    ) => SessionDraft["activities"][number],
  ) => {
    const previous = draftRef.current;
    updateDraft({
      ...previous,
      activities: previous.activities.map((activity) =>
        activity.id === id ? update(activity) : activity,
      ),
    });
  };
  useEffect(() => {
    return () => {
      useSelectionHandoff.getState().clearOwner(generation, ownerId);
    };
  }, [generation, ownerId]);

  const openSelection = (kind: SelectionKind, activityId?: string) => {
    if (activeTicket.current)
      useSelectionHandoff.getState().cancel(activeTicket.current.ticket);
    const ticket: SelectionTicket = {
      generation,
      ownerId,
      requestId: uuidv4(),
      ...(activityId ? { activityId } : {}),
    };
    useSelectionHandoff.getState().begin(ticket, kind);
    activeTicket.current = { ticket, kind };
    const common = `requestId=${encodeURIComponent(ticket.requestId)}&ownerId=${encodeURIComponent(ownerId)}&generation=${generation}`;
    const activity = draftRef.current.activities.find(
      (item) => item.id === activityId,
    );
    if (kind === "template")
      router.push(
        `/(public)/(app)/session/select?programId=${encodeURIComponent(initial.program.id)}&${common}`,
      );
    else if (kind === "exercise")
      router.push(
        `/(public)/(app)/exercise/select?activityId=${encodeURIComponent(activityId ?? "")}&currentExerciseId=${encodeURIComponent(activity?.exerciseId ?? "")}&${common}`,
      );
    else
      router.push(
        `/(public)/(app)/load?activityId=${encodeURIComponent(activityId ?? "")}&exerciseId=${encodeURIComponent(activity?.exerciseId ?? "")}&loadType=${activity?.loadType ?? ""}&loadValue=${activity?.loadValue ?? ""}&${common}`,
      );
  };

  // Apply a selection made on another screen when this one regains focus.
  const applySelection = useEffectEvent(() => {
    if (!focused) {
      sawBlur.current = true;
      return;
    }
    if (!sawBlur.current || !activeTicket.current) return;
    sawBlur.current = false;
    const active = activeTicket.current;
    const entry = entries[active.ticket.requestId];
    if (!entry?.result) {
      useSelectionHandoff.getState().cancel(active.ticket);
      activeTicket.current = null;
      return;
    }
    const result = useSelectionHandoff
      .getState()
      .consume(active.ticket, active.kind);
    activeTicket.current = null;
    if (!result) return;
    if (result.kind === "load" && active.ticket.activityId) {
      updateActivity(active.ticket.activityId, (activity) => ({
        ...activity,
        loadType: result.load.type,
        loadValue: result.load.value,
        ...(result.load.type === "PERCENT"
          ? {
              warmupSets: activity.warmupSets.map((set) =>
                set.status === "Planned"
                  ? { ...set, weightValue: null, weightUnit: null }
                  : set,
              ),
              mainSets: activity.mainSets.map((set) =>
                set.status === "Planned"
                  ? { ...set, weightValue: null, weightUnit: null }
                  : set,
              ),
            }
          : {}),
      }));
    } else if (result.kind === "exercise" && active.ticket.activityId) {
      const activityId = active.ticket.activityId;
      let exercise;
      try {
        exercise = read((db) => getSavedExercise(db, result.exerciseId));
      } catch {
        Alert.alert("Selection Failed", "The exercise could not be loaded.");
        return;
      }
      if (!exercise || exercise.deleted) return;
      setExercises((previous) => ({
        ...previous,
        [exercise.id]: {
          id: exercise.id,
          name: exercise.name,
          deleted: exercise.deleted,
          loadKind: exercise.loadKind,
          oneRepMax: exercise.oneRepMax,
        },
      }));
      updateActivity(activityId, (activity) => ({
        ...activity,
        exerciseId: exercise.id,
        loadType:
          exercise.oneRepMax && exercise.oneRepMax.value > 0
            ? "PERCENT"
            : "RPE",
        loadValue:
          exercise.oneRepMax && exercise.oneRepMax.value > 0 ? 0.75 : 8,
        warmupSets: activity.warmupSets.map((set) => ({
          ...set,
          weightValue: null,
          weightUnit: null,
          feedback: "Neutral",
        })),
        mainSets: activity.mainSets.map((set) => ({
          ...set,
          weightValue: null,
          weightUnit: null,
          feedback: "Neutral",
        })),
      }));
    } else if (
      result.kind === "template" &&
      result.programId === initial.program.id &&
      !session
    ) {
      try {
        const resolved = read((db) =>
          resolveTemplateChoice(db, result.programId, result.sessionId),
        );
        if (!resolved)
          throw new Error("The selected template is no longer available.");
        if (resolved.kind === "planned") {
          leaveWithoutWarning(() =>
            router.replace(
              `/(public)/(app)/program/${encodeURIComponent(result.programId)}/session/form?sessionId=${encodeURIComponent(resolved.sessionId)}`,
            ),
          );
          return;
        }
        const sourceSeed = read((db) =>
          getSessionEditorSeed(db, result.programId, resolved.sessionId),
        );
        if (!sourceSeed?.session)
          throw new Error("The selected template is no longer available.");
        const source = sourceSeed.session;
        const sourceRef = {
          sessionId: source.id,
          baseRevision: source.revision,
          newLineageId: uuidv4(),
        };
        templateRef.current = sourceRef;
        setTemplate(sourceRef);
        setFromType("Template");
        setExercises(
          Object.fromEntries(
            sourceSeed.exercises.map((item) => [item.id, item]),
          ),
        );
        updateDraft(createTemplateDraft(source, uuidv4));
      } catch (error) {
        Alert.alert(
          "Template Failed",
          error instanceof Error
            ? error.message
            : "The template could not be loaded.",
        );
      }
    }
  });
  useEffect(() => applySelection(), [focused, entries]);

  const changeSetCount = (
    activityId: string,
    kind: "Warmup" | "Main",
    text: string,
  ) => {
    const count = text === "" ? 0 : Number(text);
    if (!Number.isInteger(count) || count < 0 || count > 99) return;
    const previous = draftRef.current;
    const index = previous.activities.findIndex(
      (item) => item.id === activityId,
    );
    const activity = previous.activities[index];
    if (!activity) return;
    const field = kind === "Warmup" ? "warmupSets" : "mainSets";
    const original = activity[field];
    const sets = original.slice(0, count);
    while (sets.length < count) {
      const last = sets.at(-1);
      const next = newDraftSet(
        uuidv4,
        terminal ? draftRef.current.endMs : undefined,
      );
      if (activity.loadType === "RPE" && last) {
        next.weightValue = last.weightValue;
        next.weightUnit = last.weightUnit;
      }
      sets.push(next);
    }
    const added = new Set(sets.slice(original.length).map(({ id }) => id));
    updateActivity(activityId, (item) => ({ ...item, [field]: sets }));
    if (
      original.length ||
      !added.size ||
      activity.loadType !== "RPE" ||
      !activity.exerciseId
    )
      return;
    const source = session
      ? { kind: "session" as const, sessionId: session.id }
      : templateRef.current
        ? {
            kind: "template" as const,
            sessionId: templateRef.current.sessionId,
          }
        : null;
    let hints;
    try {
      hints = read((db) =>
        getPlanningWeightHints(
          db,
          initial.program.id,
          source,
          previous.activities,
          kind,
        ),
      );
    } catch {
      Alert.alert(
        "Weight Hint Unavailable",
        "The session draft was kept. You can enter weights while recording sets.",
      );
      return;
    }
    const weight = hints.find((hint) => hint.activityIndex === index)?.weight;
    if (!weight) return;
    updateActivity(activityId, (item) => ({
      ...item,
      [field]: item[field].map((set) =>
        added.has(set.id) && set.weightValue === null
          ? { ...set, weightValue: weight.value, weightUnit: weight.unit }
          : set,
      ),
    }));
  };

  const save = (action: "save" | "complete" | "delete" | "reset") => {
    if (hasLeft()) return;
    const value = draftRef.current;
    if (
      (action === "save" || action === "complete") &&
      (!value.name.trim() ||
        value.activities.some(
          (activity) =>
            !activity.exerciseId ||
            activity.reps === null ||
            activity.reps <= 0 ||
            activity.loadType === null ||
            activity.loadValue === null ||
            !activity.mainSets.length,
        ))
    ) {
      setShowValidation(true);
      return;
    }
    try {
      if (action === "delete" && session)
        deleteSession(initial.program.id, session.id, session.revision);
      else if (action === "reset" && session)
        resetSession(initial.program.id, session.id, session.revision);
      else if (action === "complete" && session)
        saveAndCompleteSession(
          initial.program.id,
          session.id,
          session.revision,
          value,
        );
      else if (action === "save" && session)
        saveSession(
          initial.program.id,
          session.id,
          session.revision,
          value,
          renameLineage && value.name !== session.name,
        );
      else if (action === "save")
        createSession(
          initial.program.id,
          newSessionId,
          value,
          templateRef.current,
        );
      else throw new Error("The session cannot be updated.");
    } catch (error) {
      Alert.alert(
        "Session Not Saved",
        error instanceof Error
          ? error.message
          : "The session could not be saved. Your draft is still here.",
      );
      return;
    }
    leaveWithoutWarning(() => {
      if (action === "complete")
        router.dismissTo(
          `/(public)/(app)/program/${encodeURIComponent(initial.program.id)}`,
        );
      else if (action === "delete") {
        router.back();
        router.back();
      } else router.back();
    });
  };

  const chooseTemplate = () => {
    if (!dirty) {
      openSelection("template");
      return;
    }
    Alert.alert(
      "Change Plan Source?",
      "Switching to Plan From Template will discard your edits.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard Edits",
          style: "destructive",
          onPress: () => openSelection("template"),
        },
      ],
    );
  };
  const chooseScratch = () => {
    const apply = () => {
      templateRef.current = null;
      setTemplate(null);
      setFromType("Scratch");
      updateDraft({
        name: "",
        deload: false,
        startMs: null,
        endMs: null,
        activities: [],
      });
    };
    if (!dirty) {
      apply();
      return;
    }
    Alert.alert(
      "Change Plan Source?",
      "Switching to Plan From Scratch will discard your edits.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Discard Edits", style: "destructive", onPress: apply },
      ],
    );
  };
  const changeDeload = (deload: boolean) => {
    const apply = () => updateDraft({ ...draftRef.current, deload });
    if (
      deload &&
      session?.status !== "Incomplete" &&
      (session?.status !== "Done" || initial.policy?.isLatestCompletedInLineage)
    )
      Alert.alert(
        "Mark as Deload Session?",
        "This session will be ignored when planning the next session from this template. The last completed non-deload session will be used instead.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark as Deload", onPress: apply },
        ],
      );
    else apply();
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: session ? "Edit Session" : "Add Session",
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              disabled={!session && sessionCount > 0 && !fromType}
              onPress={() => save("save")}
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
        contentContainerClassName="pt-5 gap-10 pb-18"
        contentInsetAdjustmentBehavior="automatic"
        enabled={focused}
      >
        {!session && sessionCount > 0 && (
          <SegmentedInputThemed
            label="Plan From"
            value={fromType}
            accessibilityLabel="Choose session source"
            animateOnPress={false}
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
            onChange={(value) =>
              value === "Scratch" ? chooseScratch() : chooseTemplate()
            }
          />
        )}
        {(session !== null || fromType !== undefined || sessionCount === 0) && (
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
            <Animated.View layout={LinearTransition.duration(220)}>
              <MultilineTextInputThemed
                label="Session Name"
                value={draft.name}
                maxLength={50}
                error={
                  showValidation && !draft.name.trim() ? "Required" : undefined
                }
                cardVariants={["square"]}
                stack={
                  session && draft.name !== session.name
                    ? { index: 0, size: 2 }
                    : undefined
                }
                onChangeText={(name) =>
                  updateDraft({ ...draftRef.current, name })
                }
              />
              {session && draft.name !== session.name && (
                <PressableThemed
                  accessibilityRole="switch"
                  accessibilityLabel="Rename all sessions in template"
                  accessibilityHint="Renames every session in this template when saved"
                  accessibilityState={{ checked: renameLineage }}
                  onPress={() => setRenameLineage(!renameLineage)}
                >
                  <Card variants={["square"]} stack={{ index: 1, size: 2 }}>
                    <Text
                      accessible={false}
                      maxFontSizeMultiplier={2}
                      className="text-muted text-xl tracking-tight"
                    >
                      Rename all sessions in template
                    </Text>
                    <View
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      pointerEvents="none"
                    >
                      <SwitchThemed
                        value={renameLineage}
                        onValueChange={setRenameLineage}
                      />
                    </View>
                  </Card>
                </PressableThemed>
              )}
              {sessionCount < 3 && fromType !== "Template" && (
                <HelperText className="leading-tight">
                  Use a descriptive name like &apos;Lower Body&apos; or
                  &apos;Chest Day&apos;.
                </HelperText>
              )}
            </Animated.View>
            <Animated.View layout={LinearTransition.duration(220)}>
              {draft.activities.map((activity, index) => {
                const exercise = activity.exerciseId
                  ? exercises[activity.exerciseId]
                  : undefined;
                const exerciseError = showValidation && !activity.exerciseId;
                const load =
                  activity.loadType !== null && activity.loadValue !== null
                    ? activity.loadType === "PERCENT"
                      ? `${Number((activity.loadValue * 100).toFixed(2))}%`
                      : `RPE ${activity.loadValue}`
                    : "Unavailable";
                return (
                  <AnimatedViewStyled
                    key={activity.id}
                    collapsable={false}
                    entering={FadeInUp.duration(220)}
                    exiting={FadeOutUp.duration(220)}
                  >
                    <Card
                      className="h-auto flex-row items-stretch gap-0 rounded-none p-0"
                      variants={["square"]}
                      stack={{ index, size: draft.activities.length + 1 }}
                    >
                      <View
                        className={
                          exerciseError
                            ? "relative z-10 flex-initial basis-1/2 justify-evenly"
                            : "border-border relative flex-initial basis-1/2 justify-evenly border-r"
                        }
                      >
                        {exerciseError && (
                          <View
                            pointerEvents="none"
                            className="border-destructive absolute inset-0 z-10 border"
                          />
                        )}
                        <View className="relative py-2 pb-6">
                          <PressableThemed
                            accessibilityLabel="Navigate to select exercise form"
                            onPress={() =>
                              openSelection("exercise", activity.id)
                            }
                          >
                            <View className="h-auto w-full flex-row items-center justify-between gap-2 pr-3 pl-5">
                              <Text
                                maxFontSizeMultiplier={2.5}
                                className={
                                  exerciseError
                                    ? "text-destructive flex-1 text-xl leading-tight"
                                    : exercise
                                      ? "text-foreground flex-1 text-xl leading-tight"
                                      : "text-primary flex-1 text-xl leading-tight"
                                }
                              >
                                {exercise
                                  ? `${exercise.name}${exercise.deleted ? " (Deleted)" : ""}`
                                  : activity.exerciseId
                                    ? "Unavailable exercise"
                                    : "Select Exercise"}
                              </Text>
                              <Text
                                maxFontSizeMultiplier={2.5}
                                className="text-muted text-xl"
                              >
                                <AntDesign name="right" size={15} />
                              </Text>
                            </View>
                          </PressableThemed>
                          {exerciseError && (
                            <Text
                              accessibilityRole="alert"
                              maxFontSizeMultiplier={2}
                              className="text-destructive absolute bottom-2.5 left-5 z-10 text-sm"
                            >
                              Required
                            </Text>
                          )}
                        </View>
                        <PressableThemed
                          className="absolute top-1 left-2 p-2"
                          hitSlop={20}
                          accessibilityLabel="Remove exercise from Session"
                          onPress={() => {
                            const remove = () =>
                              updateDraft({
                                ...draftRef.current,
                                activities: draftRef.current.activities.filter(
                                  (item) => item.id !== activity.id,
                                ),
                              });
                            if (
                              !session?.activities.some(
                                (item) => item.id === activity.id,
                              )
                            ) {
                              remove();
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
                                  onPress: remove,
                                },
                              ],
                            );
                          }}
                        >
                          <Text
                            maxFontSizeMultiplier={2.5}
                            className="text-destructive text-xl"
                          >
                            <Feather name="trash-2" size={20} />
                          </Text>
                        </PressableThemed>
                        {index !== 0 && (
                          <PressableThemed
                            className="absolute top-2 self-center p-2 opacity-50"
                            accessibilityLabel="Move exercise up"
                            onPress={() => {
                              const items = [...draftRef.current.activities];
                              const previous = items[index - 1];
                              const currentItem = items[index];
                              if (previous && currentItem) {
                                items[index - 1] = currentItem;
                                items[index] = previous;
                                updateDraft({
                                  ...draftRef.current,
                                  activities: items,
                                });
                              }
                            }}
                          >
                            <Text
                              maxFontSizeMultiplier={2.5}
                              className="text-muted"
                            >
                              <AntDesign name="up" size={15} />
                            </Text>
                          </PressableThemed>
                        )}
                        {index !== draft.activities.length - 1 && (
                          <PressableThemed
                            className="absolute bottom-2 self-center p-2 opacity-50"
                            accessibilityLabel="Move exercise down"
                            onPress={() => {
                              const items = [...draftRef.current.activities];
                              const next = items[index + 1];
                              const currentItem = items[index];
                              if (next && currentItem) {
                                items[index + 1] = currentItem;
                                items[index] = next;
                                updateDraft({
                                  ...draftRef.current,
                                  activities: items,
                                });
                              }
                            }}
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
                        <TextInputThemed
                          label="Warmup Sets"
                          value={
                            activity.warmupSets.length
                              ? String(activity.warmupSets.length)
                              : ""
                          }
                          keyboardType="number-pad"
                          numeric
                          maxLength={1}
                          placeholder="0"
                          selectTextOnFocus
                          stack={{ index: 0, size: 5 }}
                          cardVariants={["square", "small", "transparent"]}
                          onChangeText={(value) =>
                            changeSetCount(activity.id, "Warmup", value)
                          }
                        />
                        <TextInputThemed
                          label="Main Sets"
                          value={
                            activity.mainSets.length
                              ? String(activity.mainSets.length)
                              : ""
                          }
                          keyboardType="number-pad"
                          numeric
                          maxLength={2}
                          placeholder="0"
                          selectTextOnFocus
                          stack={{ index: 1, size: 5 }}
                          cardVariants={["square", "small", "transparent"]}
                          error={
                            showValidation && !activity.mainSets.length
                              ? "Required"
                              : undefined
                          }
                          onChangeText={(value) =>
                            changeSetCount(activity.id, "Main", value)
                          }
                        />
                        <NumberDraftInput
                          key={`${activity.id}:reps`}
                          compact
                          stack={{ index: 2, size: 5 }}
                          maxLength={2}
                          label="Repetitions"
                          value={activity.reps}
                          error={
                            showValidation &&
                            (activity.reps === null || activity.reps <= 0)
                              ? "Required"
                              : undefined
                          }
                          onChange={(reps) =>
                            updateActivity(activity.id, (item) => ({
                              ...item,
                              reps,
                            }))
                          }
                        />
                        <NumberDraftInput
                          key={`${activity.id}:rest`}
                          compact
                          stack={{ index: 3, size: 5 }}
                          maxLength={2}
                          label="Rest (minutes)"
                          value={activity.restMinutes}
                          onChange={(restMinutes) =>
                            updateActivity(activity.id, (item) => ({
                              ...item,
                              restMinutes,
                            }))
                          }
                        />
                        <NavigationCardRow
                          title="Load"
                          trailingText={load}
                          stack={{ index: 4, size: 5 }}
                          cardVariants={["square", "small"]}
                          titleClassName="pr-0"
                          onPress={() => openSelection("load", activity.id)}
                          accessibilityLabel="Navigate to select exercise load form"
                        />
                      </View>
                    </Card>
                  </AnimatedViewStyled>
                );
              })}
              <PrimaryCardAction
                label="Add Exercise"
                icon={<Entypo name="circle-with-plus" size={20} />}
                cardVariants={["square"]}
                stack={{
                  index: draft.activities.length,
                  size: draft.activities.length + 1,
                }}
                disabled={draft.activities.length > 100}
                onPress={() =>
                  updateDraft({
                    ...draftRef.current,
                    activities: [
                      ...draftRef.current.activities,
                      newDraftActivity(
                        uuidv4,
                        terminal ? draftRef.current.endMs : undefined,
                      ),
                    ],
                  })
                }
              />
            </Animated.View>
          </AnimatedViewStyled>
        )}
        {terminal && draft.startMs !== null && (
          <View>
            <DateTimeInputThemed
              label="Start Date"
              value={new Date(draft.startMs)}
              mode="date"
              testID="session-start-date"
              onChange={(date) =>
                updateDraft(shiftDraftStart(draftRef.current, date.getTime()))
              }
              cardVariants={["square"]}
              stack={{ index: 0, size: 3 }}
            />
            <DateTimeInputThemed
              label="Start Time"
              value={new Date(draft.startMs)}
              mode="time"
              testID="session-start-time"
              onChange={(date) =>
                updateDraft(shiftDraftStart(draftRef.current, date.getTime()))
              }
              cardVariants={["square"]}
              stack={{ index: 1, size: 3 }}
            />
            <NumberDraftInput
              label="Elapsed Time (minutes)"
              stack={{ index: 2, size: 3 }}
              value={
                draft.endMs === null
                  ? null
                  : Math.trunc((draft.endMs - draft.startMs) / 60000)
              }
              onChange={(minutes) =>
                updateDraft({
                  ...draftRef.current,
                  endMs:
                    minutes === null || draftRef.current.startMs === null
                      ? null
                      : draftRef.current.startMs + minutes * 60000,
                })
              }
            />
          </View>
        )}
        {((initial.policy?.canSetDeload ?? false) || template !== null) && (
          <PressableThemed
            accessibilityRole="switch"
            accessibilityLabel="Deload session"
            accessibilityHint="Marks this workout as a deload session"
            accessibilityState={{ checked: draft.deload }}
            onPress={() => changeDeload(!draft.deload)}
          >
            <Card variants={["square"]}>
              <Text
                accessible={false}
                maxFontSizeMultiplier={2}
                className="text-muted text-xl tracking-tight"
              >
                Deload
              </Text>
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
              >
                <SwitchThemed
                  value={draft.deload}
                  onValueChange={changeDeload}
                  testID="session-deload-toggle"
                />
              </View>
            </Card>
          </PressableThemed>
        )}
        {session?.status === "Ready" && (
          <PrimaryCardAction
            label="Complete Workout Session"
            accessibilityLabel="Complete workout session from session form"
            cardVariants={["square"]}
            onPress={() => {
              const missing = draft.activities.some((activity) =>
                [...activity.warmupSets, ...activity.mainSets].some(
                  (set) => (set.actualReps ?? 0) <= 0,
                ),
              );
              Alert.alert(
                "Complete Workout Session?",
                missing
                  ? "Some sets do not have Actual Reps. Those sets will be marked Incomplete. You can enter their reps later."
                  : "This will mark the workout session as Done.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Complete Session",
                    style: missing ? "destructive" : "default",
                    onPress: () => save("complete"),
                  },
                ],
              );
            }}
          />
        )}
        {session && (
          <ConfirmButton
            title="Delete Session?"
            message="This will permanently delete this workout session."
            confirmText="Delete Session"
            accessibilityLabel={`Delete Workout Session with name ${session.name}`}
            cardVariants={["square"]}
            onConfirm={() => save("delete")}
          >
            Delete This Session
          </ConfirmButton>
        )}
        {session?.startMs !== null && session && (
          <View>
            <ConfirmButton
              title="Reset Session?"
              message="This will clear the recorded session data and return it to Planned status."
              confirmText="Reset Session"
              accessibilityLabel={`Reset Workout Session with name ${session.name}`}
              cardVariants={["square"]}
              onConfirm={() => save("reset")}
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
