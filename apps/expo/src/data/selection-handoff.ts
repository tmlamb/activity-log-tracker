import { create } from "zustand";

export interface SelectionTicket {
  generation: number;
  ownerId: string;
  requestId: string;
  activityId?: string;
}
export type SelectionKind = "exercise" | "load" | "template";
export type SelectionResult =
  | { kind: "exercise"; exerciseId: string }
  | { kind: "load"; load: { type: "PERCENT" | "RPE"; value: number } }
  | { kind: "template"; programId: string; sessionId: string };
interface Entry {
  ticket: SelectionTicket;
  kind: SelectionKind;
  result: SelectionResult | null;
}
interface SelectionHandoff {
  entries: Record<string, Entry>;
  begin: (ticket: SelectionTicket, kind: SelectionKind) => void;
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

/** Transient modal handoff; never stores session graphs or survives reset. */
export const useSelectionHandoff = create<SelectionHandoff>()((set, get) => ({
  entries: {},
  begin: (ticket, kind) => {
    if (
      !ticket.ownerId ||
      !ticket.requestId ||
      !Number.isSafeInteger(ticket.generation) ||
      ticket.generation < 0 ||
      ((kind === "exercise" || kind === "load") && !ticket.activityId)
    )
      throw new Error("Invalid selection request.");
    if (get().entries[ticket.requestId])
      throw new Error("Selection request already exists.");
    set((state) => ({
      entries: {
        ...state.entries,
        [ticket.requestId]: { ticket: { ...ticket }, kind, result: null },
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
    const stored =
      result.kind === "load"
        ? { ...result, load: { ...result.load } }
        : { ...result };
    set((state) => ({
      entries: {
        ...state.entries,
        [ticket.requestId]: { ...entry, result: stored },
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
