import "react-native-get-random-values";

import { useRef, useState } from "react";
import { Alert, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";
import { Stack, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { Entypo } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";

import type { PlanningWeightSource } from "~/data/repositories/planning-weights";
import type { SetKind } from "~/data/repositories/session-detail";
import type {
  DraftActivity,
  SessionDraft,
  TemplateSource,
} from "~/data/repositories/session-drafts";
import type {
  SessionEditorExercise,
  SessionEditorSeed,
} from "~/data/repositories/session-editor";
import type {
  SelectionResult,
  SelectionTicket,
} from "~/data/selection-handoff";
import ActivityRow, { exerciseLabel } from "~/components/ActivityRow";
import Card from "~/components/Card";
import { PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import DateTimeInputThemed from "~/components/DateTimeInputThemed";
import { Text } from "~/components/font-scale-text";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import MultilineTextInputThemed from "~/components/MultilineTextInputThemed";
import NumberDraftInput from "~/components/NumberDraftInput";
import PressableThemed from "~/components/PressableThemed";
import SegmentedInputThemed from "~/components/SegmentedInputThemed";
import { AnimatedViewStyled } from "~/components/Styled";
import SwitchThemed from "~/components/SwitchThemed";
import { HelperText } from "~/components/Typography";
import {
  createSession,
  deleteSession,
  resetSession,
  saveAndCompleteSession,
  saveSession,
} from "~/data/actions";
import {
  activityRows,
  applyExerciseSelection,
  applyLoadSelection,
  applyWeightHint,
  draftFromSession,
  exerciseSelectionInput,
  isActivityValid,
  newDraftActivity,
  normalizeSuperset,
  resizeSets,
  shiftDraftStart,
  swapAlternative,
} from "~/data/domain/session-editor-draft";
import { useProgramSummaries, useSessionEditorSeed } from "~/data/queries";
import { getSavedExercise } from "~/data/repositories/exercises";
import { getRecentMainUsage } from "~/data/repositories/main-usage";
import { getPlanningWeightHints } from "~/data/repositories/planning-weights";
import { supersetRows } from "~/data/repositories/session-detail";
import { getSessionEditorSeed } from "~/data/repositories/session-editor";
import { createTemplateDraft } from "~/data/repositories/template-draft";
import { resolveTemplateChoice } from "~/data/repositories/templates";
import { read, useGeneration } from "~/data/store";
import useRouter from "~/hooks/use-router";
import useSelectionRequests from "~/hooks/use-selection-requests";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

export default function SessionFormScreen() {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId?: string;
  }>();
  const seed = useSessionEditorSeed(programId, sessionId ?? null);
  const programs = useProgramSummaries();
  const program = programs.find((item) => item.id === programId);
  if (!seed || !program) return <MissingDataRedirect />;
  return (
    <SessionEditor
      key={`${programId}:${sessionId ?? "new"}`}
      seed={seed}
      sessionCount={program.sessionCount}
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
  const headerButton = useHeaderButtonProps();
  const [initial] = useState(() => seed);
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
  const generation = useGeneration();
  const session = initial.session;
  const terminal =
    session?.status === "Done" || session?.status === "Incomplete";
  const terminalEndMs = () => (terminal ? draftRef.current.endMs : undefined);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initialDraft) || template !== null;
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(dirty);
  const updateDraft = (next: SessionDraft) => {
    draftRef.current = next;
    setDraft(next);
  };
  /** Update one activity, keeping its superset's set counts and rest aligned. */
  const updateActivity = (
    id: string,
    update: (activity: DraftActivity) => DraftActivity,
  ) => {
    const previous = draftRef.current;
    updateDraft({
      ...previous,
      activities: previous.activities.map((activity) =>
        activity.id === id
          ? normalizeSuperset(update(activity), uuidv4, terminalEndMs())
          : activity,
      ),
    });
  };
  const weightSource = (): PlanningWeightSource =>
    session
      ? { kind: "session", sessionId: session.id }
      : templateRef.current
        ? { kind: "template", sessionId: templateRef.current.sessionId }
        : null;

  // Apply a selection made on another screen when this one regains focus.
  const applySelection = (result: SelectionResult, ticket: SelectionTicket) => {
    if (result.kind === "load" && ticket.activityId) {
      updateActivity(ticket.activityId, (activity) =>
        applyLoadSelection(activity, result.load, result.dropPercent),
      );
    } else if (result.kind === "exercise" && ticket.activityId) {
      const activityId = ticket.activityId;
      const alternativeId = result.alternativeId;
      if (alternativeId) {
        updateActivity(
          activityId,
          (activity) => swapAlternative(activity, alternativeId) ?? activity,
        );
        return;
      }
      let exercise;
      try {
        exercise = read((db) => getSavedExercise(db, result.exerciseId));
      } catch {
        Alert.alert("Selection Failed", "The exercise could not be loaded.");
        return;
      }
      if (!exercise || exercise.deleted) return;
      const selected = exercise;
      setExercises((previous) => ({
        ...previous,
        [selected.id]: {
          id: selected.id,
          name: selected.name,
          deleted: selected.deleted,
          loadKind: selected.loadKind,
          oneRepMax: selected.oneRepMax,
        },
      }));
      updateActivity(activityId, (activity) =>
        applyExerciseSelection(activity, selected),
      );
    } else if (result.kind === "activity" && ticket.activityId) {
      const activityId = ticket.activityId;
      setExercises((previous) => ({
        ...previous,
        ...Object.fromEntries(result.exercises.map((item) => [item.id, item])),
      }));
      // Advanced settings may have swapped in an alternative, changing the id.
      updateActivity(activityId, () => result.activity);
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
        const usage = read((db) =>
          getRecentMainUsage(db, result.programId, source.id),
        );
        updateDraft(createTemplateDraft(source, uuidv4, usage));
      } catch (error) {
        Alert.alert(
          "Template Failed",
          error instanceof Error
            ? error.message
            : "The template could not be loaded.",
        );
      }
    }
  };
  const { open } = useSelectionRequests({
    generation,
    focused,
    onResult: applySelection,
  });
  const openTemplateSelection = () =>
    open(
      "template",
      (ticket) =>
        `/(public)/(app)/session/select?programId=${encodeURIComponent(initial.program.id)}&${ticket}`,
    );
  const openExerciseSelection = (activity: DraftActivity) =>
    open(
      "exercise",
      (ticket) =>
        `/(public)/(app)/exercise/select?activityId=${encodeURIComponent(activity.id)}&currentExerciseId=${encodeURIComponent(activity.exerciseId ?? "")}&${ticket}`,
      activity.id,
      exerciseSelectionInput(activity, activity.id, (id) =>
        exerciseLabel(exercises[id], id),
      ),
    );
  const openLoadSelection = (activity: DraftActivity) =>
    open(
      "load",
      (ticket) =>
        `/(public)/(app)/load?activityId=${encodeURIComponent(activity.id)}&exerciseId=${encodeURIComponent(activity.exerciseId ?? "")}&loadType=${activity.loadType ?? ""}&loadValue=${activity.loadValue ?? ""}&dropSetCount=${activity.dropSets.length}&dropPercent=${activity.dropPercent ?? ""}&${ticket}`,
      activity.id,
    );
  const openAdvancedSettings = (activity: DraftActivity) => {
    const mains = draftRef.current.activities.flatMap(supersetRows);
    const ids = new Set(activityRows(activity).map((item) => item.exerciseId));
    open(
      "activity",
      (ticket) =>
        `/(public)/(app)/program/${encodeURIComponent(initial.program.id)}/session/form/advanced?activityId=${encodeURIComponent(activity.id)}&${ticket}`,
      activity.id,
      {
        role: "activity",
        activity,
        otherExerciseIds: [],
        exercises: Object.values(exercises).filter((item) => ids.has(item.id)),
        savedRowIds:
          session?.activities
            .flatMap(supersetRows)
            .flatMap((item) => [
              item.id,
              ...item.alternatives.map((alternative) => alternative.id),
            ]) ?? [],
        terminalEndMs: terminalEndMs(),
        weights: {
          programId: initial.program.id,
          source: weightSource(),
          parents: mains.map(({ exerciseId, loadType }) => ({
            exerciseId,
            loadType,
          })),
          parentIndex: mains.findIndex((item) => item.id === activity.id),
        },
      },
    );
  };

  const removeActivity = (activity: DraftActivity) => {
    const remove = () =>
      updateDraft({
        ...draftRef.current,
        activities: draftRef.current.activities.filter(
          (item) => item.id !== activity.id,
        ),
      });
    const count = activity.alternatives.length;
    const supersetCount = activity.supersets.length;
    if (
      !count &&
      !supersetCount &&
      !session?.activities.some((item) => item.id === activity.id)
    ) {
      remove();
      return;
    }
    const parts = [
      count ? `${count} alternative${count === 1 ? "" : "s"}` : null,
      supersetCount
        ? `${supersetCount} superset exercise${supersetCount === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean);
    Alert.alert(
      "Delete Activity?",
      parts.length
        ? `This will remove the activity and its ${parts.join(" and ")} from this session.`
        : "This will remove the activity from this session.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Activity", style: "destructive", onPress: remove },
      ],
    );
  };
  const moveActivity = (index: number, offset: -1 | 1) => {
    const items = [...draftRef.current.activities];
    const current = items[index];
    const other = items[index + offset];
    if (!current || !other) return;
    items[index + offset] = current;
    items[index] = other;
    updateDraft({ ...draftRef.current, activities: items });
  };

  const changeSetCount = (activityId: string, kind: SetKind, text: string) => {
    const previous = draftRef.current;
    const index = previous.activities.findIndex(
      (item) => item.id === activityId,
    );
    const activity = previous.activities[index];
    if (!activity) return;
    const resized = resizeSets(activity, kind, text, uuidv4, terminalEndMs());
    if (!resized) return;
    // Drop set weights follow from the sets before them: no hints to apply.
    if (kind === "Drop") {
      updateActivity(activityId, () => resized.activity);
      return;
    }
    const field = kind === "Warmup" ? "warmupSets" : "mainSets";
    const existing = new Set(
      supersetRows(activity).flatMap((row) => row[field].map(({ id }) => id)),
    );
    // Superset members follow the new count (see updateActivity).
    updateActivity(activityId, () => resized.activity);
    const updated = draftRef.current.activities[index];
    if (!updated || !resized.wasEmpty || !resized.added.size) return;
    const rows = supersetRows(updated);
    if (!rows.some((row) => row.loadType === "RPE" && row.exerciseId)) return;
    // Hints index main rows in stored order, where members follow leaders.
    const mains = draftRef.current.activities.flatMap(supersetRows);
    const offset = mains.findIndex((row) => row.id === updated.id);
    let hints;
    try {
      hints = read((db) =>
        getPlanningWeightHints(
          db,
          initial.program.id,
          weightSource(),
          mains,
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
    const weights = new Map(
      rows.map((row, rowIndex) => [
        row.id,
        hints.find((hint) => hint.activityIndex === offset + rowIndex)?.weight,
      ]),
    );
    if (![...weights.values()].some(Boolean)) return;
    const hint = <T extends DraftActivity["supersets"][number]>(row: T): T => {
      const weight = weights.get(row.id);
      if (!weight) return row;
      const added = new Set(
        row[field].flatMap(({ id }) => (existing.has(id) ? [] : [id])),
      );
      return applyWeightHint(row, kind, added, weight);
    };
    updateActivity(activityId, (item) => ({
      ...hint(item),
      supersets: item.supersets.map(hint),
    }));
  };

  const save = (action: "save" | "complete" | "delete" | "reset") => {
    if (hasLeft()) return;
    const value = draftRef.current;
    if (
      (action === "save" || action === "complete") &&
      (!value.name.trim() ||
        !value.activities.flatMap(activityRows).every(isActivityValid))
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
      openTemplateSelection();
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
          onPress: openTemplateSelection,
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
        options={{ title: session ? "Edit Session" : "Add Session" }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          {...headerButton("foreground")}
          onPress={() => router.back()}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          {...headerButton("primary", "bold")}
          disabled={!session && sessionCount > 0 && !fromType}
          accessibilityLabel="Save session and close form"
          onPress={() => save("save")}
        >
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <KeyboardAwareScrollView
        bottomOffset={40}
        className="flex-1"
        contentContainerClassName="pt-5 gap-10 pb-18"
        contentInsetAdjustmentBehavior="automatic"
        enabled={focused}
        mode="layout"
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
              {draft.activities.map((activity, index) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  exercise={
                    activity.exerciseId
                      ? exercises[activity.exerciseId]
                      : undefined
                  }
                  stack={{ index, size: draft.activities.length + 1 }}
                  showValidation={showValidation}
                  canMoveUp={index !== 0}
                  canMoveDown={index !== draft.activities.length - 1}
                  alternativeCount={activity.alternatives.length}
                  supersetCount={activity.supersets.length}
                  restLocked={activity.supersets.length > 0}
                  onSelectExercise={() => openExerciseSelection(activity)}
                  onSelectLoad={() => openLoadSelection(activity)}
                  onRemove={() => removeActivity(activity)}
                  onMoveUp={() => moveActivity(index, -1)}
                  onMoveDown={() => moveActivity(index, 1)}
                  onChangeSetCount={(kind, text) =>
                    changeSetCount(activity.id, kind, text)
                  }
                  onChange={(update) =>
                    updateActivity(activity.id, (item) => ({
                      ...item,
                      ...update,
                    }))
                  }
                  onOpenAdvanced={() => openAdvancedSettings(activity)}
                />
              ))}
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
                      newDraftActivity(uuidv4, terminalEndMs()),
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
              const missing = draft.activities
                .flatMap(supersetRows)
                .some((activity) =>
                  [
                    ...activity.warmupSets,
                    ...activity.mainSets,
                    ...activity.dropSets,
                  ].some((set) => (set.actualReps ?? 0) <= 0),
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
