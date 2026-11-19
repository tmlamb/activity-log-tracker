import "react-native-get-random-values";

import type { Href } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type {
  SelectionInput,
  SelectionKind,
  SelectionResult,
  SelectionTicket,
} from "~/data/selection-handoff";
import { useSelectionHandoff } from "~/data/selection-handoff";
import useRouter from "~/hooks/use-router";

/**
 * Open a picker screen with a scoped selection ticket, then hand its result to
 * `onResult` when this screen regains focus. Only one request is active at a
 * time; leaving a picker without choosing cancels its request.
 */
export default function useSelectionRequests({
  generation,
  focused,
  onResult,
}: {
  generation: number;
  focused: boolean;
  onResult: (result: SelectionResult, ticket: SelectionTicket) => void;
}) {
  const router = useRouter();
  const [ownerId] = useState(() => uuidv4());
  const active = useRef<{
    ticket: SelectionTicket;
    kind: SelectionKind;
  } | null>(null);
  const sawBlur = useRef(false);
  const entries = useSelectionHandoff((state) => state.entries);

  useEffect(() => {
    return () => {
      useSelectionHandoff.getState().clearOwner(generation, ownerId);
    };
  }, [generation, ownerId]);

  /**
   * Begin a request and push `path`, which must already contain a query
   * string; the ticket's parameters are appended to it.
   */
  const open = (
    kind: SelectionKind,
    path: string,
    activityId?: string,
    input?: SelectionInput,
  ) => {
    if (active.current)
      useSelectionHandoff.getState().cancel(active.current.ticket);
    const ticket: SelectionTicket = {
      generation,
      ownerId,
      requestId: uuidv4(),
      ...(activityId ? { activityId } : {}),
    };
    useSelectionHandoff.getState().begin(ticket, kind, input);
    active.current = { ticket, kind };
    router.push(
      `${path}&requestId=${encodeURIComponent(ticket.requestId)}&ownerId=${encodeURIComponent(ownerId)}&generation=${generation}` as Href,
    );
  };

  // Apply a selection made on another screen when this one regains focus.
  const apply = useEffectEvent(() => {
    if (!focused) {
      sawBlur.current = true;
      return;
    }
    if (!sawBlur.current) return;
    // Clear the flag even without a request, or a stale flag would cancel the
    // next request as soon as it begins.
    sawBlur.current = false;
    const current = active.current;
    if (!current) return;
    active.current = null;
    const entry = entries[current.ticket.requestId];
    if (!entry?.result) {
      useSelectionHandoff.getState().cancel(current.ticket);
      return;
    }
    const result = useSelectionHandoff
      .getState()
      .consume(current.ticket, current.kind);
    if (result) onResult(result, current.ticket);
  });
  useEffect(() => apply(), [focused, entries]);

  return { ownerId, open };
}
