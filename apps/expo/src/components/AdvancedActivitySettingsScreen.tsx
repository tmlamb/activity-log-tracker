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
  DraftSupersetMember,
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
import DropSetSettings from "~/components/DropSetSettings";
import ExerciseSelectCard from "~/components/ExerciseSelectCard";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import {
  activityRows,
  alignSupersetRow,
  applyExerciseSelection,
  applyLoadSelection,
  applyWeightHint,
  dropSetErrors,
  exerciseSelectionInput,
  isActivityValid,
  newDraftAlternative,
  newDraftSupersetMember,
  normalizeActivity,
  resizeSets,
  setDropSetCount,
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
/** Supersets alternate every set between their exercises; keep them small. */
const MAX_SUPERSETS = 10;

/**
 * Advanced settings for one activity: its drop sets, its alternatives and,
 * when it is a superset, the members performed alternately with it. A member
 * opens the same form on its own route with the "superset" role, limited to
 * alternatives; it follows its leader's drop sets.
 */
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
  const member = input.role === "superset";
  const [initialDraft] = useState(() => input.activity);
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(initialDraft);
  const [exercises, setExercises] = useState<
    Record<string, SessionEditorExercise>
  >(() => Object.fromEntries(input.exercises.map((item) => [item.id, item])));
  const [showValidation, setShowValidation] = useState(false);
  const [alternativesCollapsed, setAlternativesCollapsed] = useState(false);
  const [supersetsCollapsed, setSupersetsCollapsed] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const { leaveWithoutWarning, hasLeft } = useUnsavedChangesWarning(dirty);
  const savedRowIds = new Set(input.savedRowIds);

  /**
   * Store a new draft, keeping a superset aligned: nothing in it rests, and a
   * member's alternatives (like the member) have the leader's set counts and
   * drop sets. An activity is a superset while it has at least one superset
   * exercise. An activity's alternatives always have its drop sets.
   */
  const updateDraft = (next: DraftActivity) => {
    const value = member
      ? {
          ...next,
          restMinutes: 0,
          alternatives: next.alternatives.map((row) =>
            alignSupersetRow(row, next, uuidv4, input.terminalEndMs),
          ),
        }
      : normalizeActivity(next, uuidv4, input.terminalEndMs);
    draftRef.current = value;
    setDraft(value);
  };
  /**
   * Update one row by ID: the main activity, a superset member, or an
   * alternative of either.
   */
  const updateRow = (
    id: string,
    update: <T extends DraftAlternative>(row: T) => T,
  ) => {
    const updateMain = <T extends DraftSupersetMember>(main: T): T =>
      main.id === id
        ? update(main)
        : {
            ...main,
            alternatives: main.alternatives.map((item) =>
              item.id === id ? update(item) : item,
            ),
          };
    const previous = updateMain(draftRef.current);
    updateDraft({ ...previous, supersets: previous.supersets.map(updateMain) });
  };
  const updateAlternatives = (alternatives: DraftAlternative[]) =>
    updateDraft({ ...draftRef.current, alternatives });
  const updateSupersets = (supersets: DraftSupersetMember[]) =>
    updateDraft({ ...draftRef.current, supersets });

  /** Exercises from `rows`, so the selection handoff carries only those. */
  const exercisesOf = (rows: DraftAlternative[]) => {
    const ids = new Set(rows.map((row) => row.exerciseId));
    return Object.values(exercises).filter((item) => ids.has(item.id));
  };

  const applySelection = (
    result: SelectionResult,
    selection: SelectionTicket,
  ) => {
    const rowId = selection.activityId;
    if (!rowId) return;
    if (result.kind === "load") {
      updateRow(rowId, (row) => applyLoadSelection(row, result.load));
    } else if (result.kind === "activity") {
      // A member's own settings, which may have swapped in an alternative.
      const { supersets: _supersets, ...settings } = result.activity;
      setExercises((previous) => ({
        ...previous,
        ...Object.fromEntries(result.exercises.map((item) => [item.id, item])),
      }));
      updateSupersets(
        draftRef.current.supersets.map((item) =>
          item.id === rowId ? settings : item,
        ),
      );
    } else if (result.kind === "exercise") {
      const alternativeId = result.alternativeId;
      if (alternativeId) {
        const previous = draftRef.current;
        if (rowId === previous.id) {
          const swapped = swapAlternative(previous, alternativeId);
          if (swapped) updateDraft(swapped);
        } else
          updateSupersets(
            previous.supersets.map((item) =>
              item.id === rowId
                ? (swapAlternative(item, alternativeId) ?? item)
                : item,
            ),
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
      (ticket) =>
        `/(public)/(app)/exercise/select?activityId=${encodeURIComponent(row.id)}&currentExerciseId=${encodeURIComponent(row.exerciseId ?? "")}&${ticket}`,
      row.id,
      exerciseSelectionInput(
        draftRef.current,
        row.id,
        (id) => exerciseLabel(exercises[id], id),
        input.otherExerciseIds,
      ),
    );
  const openLoadSelection = (row: DraftAlternative) =>
    open(
      "load",
      (ticket) =>
        `/(public)/(app)/load?activityId=${encodeURIComponent(row.id)}&exerciseId=${encodeURIComponent(row.exerciseId ?? "")}&loadType=${row.loadType ?? ""}&loadValue=${row.loadValue ?? ""}&${ticket}`,
      row.id,
    );

  /**
   * The session's main rows for weight hints, with this form's activity and
   * members in place of the ones it was opened with.
   */
  const weightParents = () => {
    const { parents, parentIndex } = input.weights;
    const current = [draftRef.current, ...draftRef.current.supersets].map(
      ({ exerciseId, loadType }) => ({ exerciseId, loadType }),
    );
    return [
      ...parents.slice(0, parentIndex),
      ...current,
      ...parents.slice(parentIndex + 1 + input.activity.supersets.length),
    ];
  };

  const openSupersetSettings = (target: DraftSupersetMember) => {
    const index = draftRef.current.supersets.findIndex(
      (item) => item.id === target.id,
    );
    const row = draftRef.current.supersets[index];
    if (!row) return;
    const own = new Set([row.id, ...row.alternatives.map(({ id }) => id)]);
    const others = activityRows(draftRef.current).filter(
      (item) => !own.has(item.id),
    );
    open(
      "activity",
      (ticket) =>
        `/(public)/(app)/program/${encodeURIComponent(input.weights.programId)}/session/form/advanced/superset?activityId=${encodeURIComponent(row.id)}&${ticket}`,
      row.id,
      {
        role: "superset",
        activity: { ...row, supersets: [] },
        otherExerciseIds: [
          ...new Set([
            ...input.otherExerciseIds,
            ...others.flatMap((item) =>
              item.exerciseId === null ? [] : [item.exerciseId],
            ),
          ]),
        ],
        exercises: exercisesOf([row, ...row.alternatives]),
        savedRowIds: input.savedRowIds,
        terminalEndMs: input.terminalEndMs,
        weights: {
          ...input.weights,
          parents: weightParents(),
          parentIndex: input.weights.parentIndex + 1 + index,
        },
      },
    );
  };

  const confirmRemoval = (
    id: string,
    title: string,
    message: string,
    remove: () => void,
  ) => {
    if (!savedRowIds.has(id)) {
      remove();
      return;
    }
    Alert.alert(`Delete ${title}?`, message, [
      { text: "Cancel", style: "cancel" },
      { text: `Delete ${title}`, style: "destructive", onPress: remove },
    ]);
  };
  const removeAlternative = (alternative: DraftAlternative) =>
    confirmRemoval(
      alternative.id,
      "Alternative",
      "This will remove the alternative exercise from this activity.",
      () =>
        updateAlternatives(
          draftRef.current.alternatives.filter(
            (item) => item.id !== alternative.id,
          ),
        ),
    );
  const removeSuperset = (superset: DraftSupersetMember) =>
    confirmRemoval(
      superset.id,
      "Superset Exercise",
      "This will remove the superset exercise from this activity.",
      () =>
        updateSupersets(
          draftRef.current.supersets.filter((item) => item.id !== superset.id),
        ),
    );
  const swap = <T,>(items: T[], index: number, offset: -1 | 1) => {
    const next = [...items];
    const current = next[index];
    const other = next[index + offset];
    if (!current || !other) return null;
    next[index + offset] = current;
    next[index] = other;
    return next;
  };
  const moveAlternative = (index: number, offset: -1 | 1) => {
    const items = swap(draftRef.current.alternatives, index, offset);
    if (items) updateAlternatives(items);
  };
  const moveSuperset = (index: number, offset: -1 | 1) => {
    const items = swap(draftRef.current.supersets, index, offset);
    if (items) updateSupersets(items);
  };

  /**
   * A superset's set counts are shared: editing them on any superset row
   * resizes the activity's own sets, and every superset row follows it (see
   * updateDraft). The session form gets the new counts with these settings.
   */
  const changeSupersetSetCount = (kind: "Warmup" | "Main", text: string) => {
    const resized = resizeSets(
      draftRef.current,
      kind,
      text,
      uuidv4,
      input.terminalEndMs,
    );
    if (resized) updateDraft(resized.activity);
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
    let hints;
    try {
      hints = read((db) =>
        getAlternativeWeightHints(
          db,
          input.weights.programId,
          input.weights.source,
          // Weight hints match on this form's main exercise, which may have changed.
          weightParents(),
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
    if (Object.values(dropSetErrors(value)).some(Boolean)) {
      setShowValidation(true);
      return;
    }
    if (!value.alternatives.every(isActivityValid)) {
      setShowValidation(true);
      // Errors are on the alternatives, so make sure they're visible.
      setAlternativesCollapsed(false);
      return;
    }
    if (
      !value.supersets
        .flatMap((item) => [item, ...item.alternatives])
        .every(isActivityValid)
    ) {
      setShowValidation(true);
      setSupersetsCollapsed(false);
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
        member
          ? "The advanced settings form is no longer waiting for these settings."
          : "The session form is no longer waiting for these settings.",
      );
      return;
    }
    leaveWithoutWarning(() => router.back());
  };

  const count = draft.alternatives.length;
  const supersetCount = draft.supersets.length;
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
                // A member's alternatives alternate sets like the member does.
                setCountsLocked={member}
                restLocked={member || draft.supersets.length > 0}
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
              onPress={() => {
                const previous = draftRef.current;
                const alternative = newDraftAlternative(
                  uuidv4,
                  input.terminalEndMs,
                );
                updateAlternatives([
                  ...previous.alternatives,
                  member
                    ? alignSupersetRow(
                        alternative,
                        previous,
                        uuidv4,
                        input.terminalEndMs,
                      )
                    : alternative,
                ]);
              }}
            />
          </Animated.View>
        </CollapsibleSection>
        {!member && (
          <CollapsibleSection
            title="Supersets"
            collapsed={supersetsCollapsed}
            onCollapsedChange={setSupersetsCollapsed}
            headerClassName="pt-0"
          >
            <Animated.View layout={LinearTransition.duration(220)}>
              {draft.supersets.map((superset, index) => (
                <ActivityRow
                  key={superset.id}
                  activity={superset}
                  exercise={
                    superset.exerciseId
                      ? exercises[superset.exerciseId]
                      : undefined
                  }
                  stack={{ index, size: supersetCount + 1 }}
                  showValidation={showValidation}
                  canMoveUp={index !== 0}
                  canMoveDown={index !== supersetCount - 1}
                  removeLabel="Remove superset exercise"
                  alternativeCount={superset.alternatives.length}
                  restLocked
                  onSelectExercise={() => openExerciseSelection(superset)}
                  onSelectLoad={() => openLoadSelection(superset)}
                  onRemove={() => removeSuperset(superset)}
                  onMoveUp={() => moveSuperset(index, -1)}
                  onMoveDown={() => moveSuperset(index, 1)}
                  onChangeSetCount={changeSupersetSetCount}
                  onChange={(update) =>
                    updateRow(superset.id, (row) => ({ ...row, ...update }))
                  }
                  onOpenAdvanced={() => openSupersetSettings(superset)}
                />
              ))}
              <PrimaryCardAction
                label="Add Superset Exercise"
                icon={<Entypo name="circle-with-plus" size={20} />}
                cardVariants={["square"]}
                stack={{ index: supersetCount, size: supersetCount + 1 }}
                disabled={supersetCount >= MAX_SUPERSETS}
                onPress={() =>
                  updateSupersets([
                    ...draftRef.current.supersets,
                    newDraftSupersetMember(
                      draftRef.current,
                      uuidv4,
                      input.terminalEndMs,
                    ),
                  ])
                }
              />
            </Animated.View>
          </CollapsibleSection>
        )}
        {!member && (
          <DropSetSettings
            activity={draft}
            showValidation={showValidation}
            onChangeCount={(text, percent) => {
              const next = setDropSetCount(
                draftRef.current,
                text,
                percent,
                uuidv4,
                input.terminalEndMs,
              );
              if (next) updateDraft(next);
            }}
            onChangePercent={(dropPercent) =>
              updateDraft({ ...draftRef.current, dropPercent })
            }
          />
        )}
      </KeyboardAwareScrollView>
    </>
  );
}
