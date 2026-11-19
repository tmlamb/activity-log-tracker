import { create } from "zustand";

import type { PlanningWeightSource } from "./repositories/planning-weights";
import type { DraftActivity } from "./repositories/session-drafts";
import type { SessionEditorExercise } from "./repositories/session-editor";

export interface SelectionTicket {
  generation: number;
  ownerId: string;
  requestId: string;
  activityId?: string;
}
export type SelectionKind = "exercise" | "load" | "template" | "activity";

/** What the advanced activity settings form edits, sent by the session form. */
export interface ActivitySettingsInput {
  activity: DraftActivity;
  exercises: SessionEditorExercise[];
  /** Rows already saved in the session, which ask before being removed. */
  savedRowIds: string[];
  /** End time for new sets in a finished session; undefined when planning. */
  terminalEndMs: number | null | undefined;
  /** Context for weight hints on alternative rows. */
  weights: {
    programId: string;
    source: PlanningWeightSource;
    parents: {
      exerciseId: string | null;
      loadType: "PERCENT" | "RPE" | null;
    }[];
    parentIndex: number;
  };
}

/** Limits on an exercise pick, sent with an exercise request. */
export interface ExerciseSelectionInput {
  /** The activity's alternatives, listed first; picking one swaps it in. */
  alternatives: { activityId: string; exerciseId: string; name: string }[];
  /** Exercises already used by this activity, hidden from the library list. */
  excludeExerciseIds: string[];
}
export type SelectionInput = ActivitySettingsInput | ExerciseSelectionInput;

export type SelectionResult =
  | {
      kind: "exercise";
      exerciseId: string;
      /** Set when an alternative was picked: swap that row in. */
      alternativeId?: string;
    }
  | { kind: "load"; load: { type: "PERCENT" | "RPE"; value: number } }
  | { kind: "template"; programId: string; sessionId: string }
  | {
      kind: "activity";
      activity: DraftActivity;
      exercises: SessionEditorExercise[];
    };
type Entry = {
  ticket: SelectionTicket;
  result: SelectionResult | null;
} & (
  | { kind: "activity"; input: ActivitySettingsInput }
  | { kind: "exercise"; input: ExerciseSelectionInput | null }
  | { kind: "load" | "template"; input: null }
);
interface SelectionHandoff {
  entries: Record<string, Entry>;
  begin: (
    ticket: SelectionTicket,
    kind: SelectionKind,
    input?: SelectionInput,
  ) => void;
  complete: (ticket: SelectionTicket, result: SelectionResult) => boolean;
  consume: (
    ticket: SelectionTicket,
    kind: SelectionKind,
  ) => SelectionResult | null;
  cancel: (ticket: SelectionTicket) => void;
  clearOwner: (generation: number, ownerId: string) => void;
  clearOtherGenerations: (generation: number) => void;
}

function matches(a: SelectionTicket, b: SelectionTicket) {
  return (
    a.generation === b.generation &&
    a.ownerId === b.ownerId &&
    a.requestId === b.requestId &&
    a.activityId === b.activityId
  );
}

/**
 * Copy requests and results so neither screen shares mutable objects. Every
 * value here is plain JSON (`undefined` fields are dropped, as when saved).
 */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Transient modal handoff; never survives reset. Only an activity request
 * carries a draft: one activity and its alternatives, never a whole session.
 * An exercise request may carry the activity's alternatives and used exercises.
 */
export const useSelectionHandoff = create<SelectionHandoff>()((set, get) => ({
  entries: {},
  begin: (ticket, kind, input) => {
    if (
      !ticket.ownerId ||
      !ticket.requestId ||
      !Number.isSafeInteger(ticket.generation) ||
      ticket.generation < 0 ||
      ((kind === "exercise" || kind === "load" || kind === "activity") &&
        !ticket.activityId) ||
      (kind === "activity" && input === undefined) ||
      (kind !== "activity" && kind !== "exercise" && input !== undefined)
    )
      throw new Error("Invalid selection request.");
    if (get().entries[ticket.requestId])
      throw new Error("Selection request already exists.");
    set((state) => ({
      entries: {
        ...state.entries,
        // Validated above: only activity and exercise requests carry input.
        [ticket.requestId]: {
          ticket: { ...ticket },
          kind,
          input: input === undefined ? null : clone(input),
          result: null,
        } as Entry,
      },
    }));
  },
  complete: (ticket, result) => {
    const entry = get().entries[ticket.requestId];
    if (
      !entry ||
      !matches(entry.ticket, ticket) ||
      entry.kind !== result.kind ||
      entry.result !== null
    )
      return false;
    set((state) => ({
      entries: {
        ...state.entries,
        [ticket.requestId]: { ...entry, result: clone(result) },
      },
    }));
    return true;
  },
  consume: (ticket, kind) => {
    const entry = get().entries[ticket.requestId];
    if (
      !entry ||
      !matches(entry.ticket, ticket) ||
      entry.kind !== kind ||
      !entry.result
    )
      return null;
    const { [ticket.requestId]: _removed, ...entries } = get().entries;
    set({ entries });
    return entry.result;
  },
  cancel: (ticket) => {
    const entry = get().entries[ticket.requestId];
    if (!entry || !matches(entry.ticket, ticket)) return;
    const { [ticket.requestId]: _removed, ...entries } = get().entries;
    set({ entries });
  },
  clearOwner: (generation, ownerId) =>
    set((state) => ({
      entries: Object.fromEntries(
        Object.entries(state.entries).filter(
          ([, entry]) =>
            entry.ticket.generation !== generation ||
            entry.ticket.ownerId !== ownerId,
        ),
      ),
    })),
  clearOtherGenerations: (generation) =>
    set((state) => ({
      entries: Object.fromEntries(
        Object.entries(state.entries).filter(
          ([, entry]) => entry.ticket.generation === generation,
        ),
      ),
    })),
}));
