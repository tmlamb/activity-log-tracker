import "react-native-get-random-values";

import { useRef, useState } from "react";
import { Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Stack, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { Entypo } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";

import type {
  DraftActivity,
  DraftAlternative,
} from "~/data/repositories/session-drafts";
import type { SessionEditorExercise } from "~/data/repositories/session-editor";
import type {
  ActivitySettingsInput,
  SelectionResult,
  SelectionTicket,
} from "~/data/selection-handoff";
import ActivityRow, { exerciseLabel } from "~/components/ActivityRow";
import { PrimaryCardAction } from "~/components/CardRow";
import { CollapsibleSection } from "~/components/CollapsibleSection";
import ExerciseSelectCard from "~/components/ExerciseSelectCard";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import {
  applyExerciseSelection,
  applyLoadSelection,
  applyWeightHint,
  exerciseSelectionInput,
  isActivityValid,
  newDraftAlternative,
  resizeSets,
  swapAlternative,
} from "~/data/domain/session-editor-draft";
import { getSavedExercise } from "~/data/repositories/exercises";
import { getAlternativeWeightHints } from "~/data/repositories/planning-weights";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { read, useGeneration } from "~/data/store";
import useRouter from "~/hooks/use-router";
import useSelectionRequests from "~/hooks/use-selection-requests";
import useUnsavedChangesWarning from "~/hooks/use-unsaved-changes-warning";

/** Alternatives are fallbacks; a handful is plenty, so keep the list short. */
const MAX_ALTERNATIVES = 20;

export default function AdvancedActivitySettingsScreen() {
  const params = useLocalSearchParams<{
    requestId?: string;
    ownerId?: string;
    generation?: string;
    activityId?: string;
  }>();
  const generation = useGeneration();
  const entry = useSelectionHandoff((state) =>
    params.requestId ? state.entries[params.requestId] : undefined,
  );
  if (
    entry?.kind !== "activity" ||
    entry.ticket.ownerId !== params.ownerId ||
    entry.ticket.activityId !== params.activityId ||
    String(entry.ticket.generation) !== params.generation ||
    entry.ticket.generation !== generation
  )
    return <MissingDataRedirect />;
  return (
    <AdvancedActivitySettings
      key={entry.ticket.requestId}
      ticket={entry.ticket}
      input={entry.input}
    />
  );
}

function AdvancedActivitySettings({
  ticket,
  input,
}: {
  ticket: SelectionTicket;
  input: ActivitySettingsInput;
}) {
  const router = useRouter();
  const focused = useIsFocused();
  const headerButton = useHeaderButtonProps();
  const generation = useGeneration();
  const [initialDraft] = useState(() => input.activity);
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(initialDraft);
  const [exercises, setExercises] = useState<
    Record<string, SessionEditorExercise>
  >(() => Object.fromEntries(input.exercises.map((item) => [item.id, item])));
  const [showValidation, setShowValidation] = useState(false);
  const [alternativesCollapsed, setAlternativesCollapsed] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(dirty);
  const savedRowIds = new Set(input.savedRowIds);

  const updateDraft = (next: DraftActivity) => {
    draftRef.current = next;
    setDraft(next);
  };
  /** Update the main activity (its own ID) or one of its alternatives. */
  const updateRow = (
    id: string,
    update: <T extends DraftAlternative>(row: T) => T,
  ) => {
    const previous = draftRef.current;
    updateDraft(
      previous.id === id
        ? update(previous)
        : {
            ...previous,
            alternatives: previous.alternatives.map((item) =>
              item.id === id ? update(item) : item,
            ),
          },
    );
  };
  const updateAlternatives = (alternatives: DraftAlternative[]) =>
    updateDraft({ ...draftRef.current, alternatives });

  const applySelection = (
    result: SelectionResult,
    selection: SelectionTicket,
  ) => {
    const rowId = selection.activityId;
    if (!rowId) return;
    if (result.kind === "load") {
      updateRow(rowId, (row) => applyLoadSelection(row, result.load));
    } else if (result.kind === "exercise") {
      const alternativeId = result.alternativeId;
      if (alternativeId) {
        const swapped =
          rowId === draftRef.current.id
            ? swapAlternative(draftRef.current, alternativeId)
            : null;
        if (swapped) updateDraft(swapped);
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
      updateRow(rowId, (row) => applyExerciseSelection(row, selected));
    }
  };
  const { open } = useSelectionRequests({
    generation,
    focused,
    onResult: applySelection,
  });
  const openExerciseSelection = (row: DraftAlternative) =>
    open(
      "exercise",
      `/(public)/(app)/exercise/select?activityId=${encodeURIComponent(row.id)}&currentExerciseId=${encodeURIComponent(row.exerciseId ?? "")}`,
      row.id,
      exerciseSelectionInput(draft, row.id, (id) =>
        exerciseLabel(exercises[id], id),
      ),
    );
  const openLoadSelection = (row: DraftAlternative) =>
    open(
      "load",
      `/(public)/(app)/load?activityId=${encodeURIComponent(row.id)}&exerciseId=${encodeURIComponent(row.exerciseId ?? "")}&loadType=${row.loadType ?? ""}&loadValue=${row.loadValue ?? ""}`,
      row.id,
    );

  const removeAlternative = (alternative: DraftAlternative) => {
    const remove = () =>
      updateAlternatives(
        draftRef.current.alternatives.filter(
          (item) => item.id !== alternative.id,
        ),
      );
    if (!savedRowIds.has(alternative.id)) {
      remove();
      return;
    }
    Alert.alert(
      "Delete Alternative?",
      "This will remove the alternative exercise from this activity.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Alternative", style: "destructive", onPress: remove },
      ],
    );
  };
  const moveAlternative = (index: number, offset: -1 | 1) => {
    const items = [...draftRef.current.alternatives];
    const current = items[index];
    const other = items[index + offset];
    if (!current || !other) return;
    items[index + offset] = current;
    items[index] = other;
    updateAlternatives(items);
  };

  const changeSetCount = (
    alternativeId: string,
    kind: "Warmup" | "Main",
    text: string,
  ) => {
    const previous = draftRef.current;
    const index = previous.alternatives.findIndex(
      (item) => item.id === alternativeId,
    );
    const alternative = previous.alternatives[index];
    if (!alternative) return;
    const resized = resizeSets(
      alternative,
      kind,
      text,
      uuidv4,
      input.terminalEndMs,
    );
    if (!resized) return;
    updateAlternatives(
      previous.alternatives.map((item) =>
        item.id === alternativeId ? resized.activity : item,
      ),
    );
    if (
      !resized.wasEmpty ||
      !resized.added.size ||
      alternative.loadType !== "RPE" ||
      !alternative.exerciseId
    )
      return;
    // Weight hints match on this form's main exercise, which may have changed.
    const parents = input.weights.parents.map((parent, parentIndex) =>
      parentIndex === input.weights.parentIndex
        ? { exerciseId: previous.exerciseId, loadType: previous.loadType }
        : parent,
    );
    let hints;
    try {
      hints = read((db) =>
        getAlternativeWeightHints(
          db,
          input.weights.programId,
          input.weights.source,
          parents,
          input.weights.parentIndex,
          previous.alternatives,
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
    updateRow(alternativeId, (row) =>
      applyWeightHint(row, kind, resized.added, weight),
    );
  };

  const save = () => {
    if (hasLeft()) return;
    const value = draftRef.current;
    if (!value.alternatives.every(isActivityValid)) {
      setShowValidation(true);
      // Errors are on the alternatives, so make sure they're visible.
      setAlternativesCollapsed(false);
      return;
    }
    if (
      !useSelectionHandoff.getState().complete(ticket, {
        kind: "activity",
        activity: value,
        exercises: Object.values(exercises),
      })
    ) {
      Alert.alert(
        "Settings Not Saved",
        "The session form is no longer waiting for these settings.",
      );
      return;
    }
    leaveWithoutWarning(() => router.back());
  };

  const count = draft.alternatives.length;
  return (
    <>
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
          accessibilityLabel="Save advanced activity settings and close form"
          onPress={save}
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
        <ExerciseSelectCard
          exercise={draft.exerciseId ? exercises[draft.exerciseId] : undefined}
          exerciseId={draft.exerciseId}
          onPress={() => openExerciseSelection(draft)}
        />
        <CollapsibleSection
          title="Alternative Exercises"
          collapsed={alternativesCollapsed}
          onCollapsedChange={setAlternativesCollapsed}
          headerClassName="pt-0"
        >
          <Animated.View layout={LinearTransition.duration(220)}>
            {draft.alternatives.map((alternative, index) => (
              <ActivityRow
                key={alternative.id}
                activity={alternative}
                exercise={
                  alternative.exerciseId
                    ? exercises[alternative.exerciseId]
                    : undefined
                }
                stack={{ index, size: count + 1 }}
                showValidation={showValidation}
                canMoveUp={index !== 0}
                canMoveDown={index !== count - 1}
                removeLabel="Remove alternative exercise"
                onSelectExercise={() => openExerciseSelection(alternative)}
                onSelectLoad={() => openLoadSelection(alternative)}
                onRemove={() => removeAlternative(alternative)}
                onMoveUp={() => moveAlternative(index, -1)}
                onMoveDown={() => moveAlternative(index, 1)}
                onChangeSetCount={(kind, text) =>
                  changeSetCount(alternative.id, kind, text)
                }
                onChange={(update) =>
                  updateRow(alternative.id, (row) => ({ ...row, ...update }))
                }
              />
            ))}
            <PrimaryCardAction
              label="Add Alternative Exercise"
              icon={<Entypo name="circle-with-plus" size={20} />}
              cardVariants={["square"]}
              stack={{ index: count, size: count + 1 }}
              disabled={count >= MAX_ALTERNATIVES}
              onPress={() =>
                updateAlternatives([
                  ...draftRef.current.alternatives,
                  newDraftAlternative(uuidv4, input.terminalEndMs),
                ])
              }
            />
          </Animated.View>
        </CollapsibleSection>
      </KeyboardAwareScrollView>
    </>
  );
}
