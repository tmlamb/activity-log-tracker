import { useRef } from "react";
import { Alert } from "react-native";

import useReleasablePreventRemove from "./use-releasable-prevent-remove";

/**
 * Warn before discarding unsaved changes. Call `leaveWithoutWarning` after a
 * successful save; from then on `hasLeft()` is true, so save handlers can
 * ignore extra taps while the screen closes instead of saving twice.
 */
export default function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const left = useRef(false);

  const { release } = useReleasablePreventRemove(
    hasUnsavedChanges,
    ({ repeat }) => {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Discard them and leave this form?",
        [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard Changes", style: "destructive", onPress: repeat },
        ],
      );
    },
    {
      // Still here after all: let save handlers run again.
      onRearm: () => {
        left.current = false;
      },
    },
  );

  return {
    leaveWithoutWarning: (navigate: () => void) => {
      left.current = true;
      release();
      navigate();
    },
    hasLeft: () => left.current,
  };
}
