/**
 * Zustand store for passing modal selection results back to parent screens.
 *
 * Because Expo Router is URL-based, modals can't easily push values back via
 * route params. Instead, the session form listens to this store and consumes
 * selections after the modal dismisses.
 *
 * Pattern:
 *  1. Parent navigates to modal with a `selectionKey` (e.g. `activityId`).
 *  2. Modal stores the result here keyed by `selectionKey`.
 *  3. Parent uses `useEffect` watching the key to pick up the result, then
 *     calls `clearPendingExercise` / `clearPendingLoad` to consume it.
 */

import { create } from "zustand";

import type { Exercise, Load, Session } from "@activity-log/ui/utils";

interface PendingExerciseSelection {
  selectionKey: string; // activityId from the form
  exercise: Exercise;
}

interface PendingLoadSelection {
  selectionKey: string; // activityId from the form
  load: Load;
}

interface PendingSessionSelection {
  session: Session;
}

interface PendingSelectionStore {
  pendingExercise: PendingExerciseSelection | null;
  pendingLoad: PendingLoadSelection | null;
  pendingSession: PendingSessionSelection | null;

  setPendingExercise: (selection: PendingExerciseSelection) => void;
  clearPendingExercise: () => void;

  setPendingLoad: (selection: PendingLoadSelection) => void;
  clearPendingLoad: () => void;

  setPendingSession: (selection: PendingSessionSelection) => void;
  clearPendingSession: () => void;
}

const usePendingSelection = create<PendingSelectionStore>()((set) => ({
  pendingExercise: null,
  pendingLoad: null,
  pendingSession: null,

  setPendingExercise: (selection) => set({ pendingExercise: selection }),
  clearPendingExercise: () => set({ pendingExercise: null }),

  setPendingLoad: (selection) => set({ pendingLoad: selection }),
  clearPendingLoad: () => set({ pendingLoad: null }),

  setPendingSession: (selection) => set({ pendingSession: selection }),
  clearPendingSession: () => set({ pendingSession: null }),
}));

export default usePendingSelection;
