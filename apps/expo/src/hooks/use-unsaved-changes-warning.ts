import { useRef } from "react";
import { Alert } from "react-native";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";

/**
 * Warn before discarding unsaved changes. Call `leaveWithoutWarning` after a
 * successful save; from then on `hasLeft()` is true, so save handlers can
 * ignore extra taps while the screen closes instead of saving twice.
 */
export default function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const allowNextRemoval = useRef(false);
  const left = useRef(false);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    if (allowNextRemoval.current) {
      allowNextRemoval.current = false;
      navigation.dispatch(data.action);
      return;
    }

    Alert.alert(
      "Discard Changes?",
      "You have unsaved changes. Discard them and leave this form?",
      [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard Changes",
          style: "destructive",
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });

  return {
    leaveWithoutWarning: (navigate: () => void) => {
      left.current = true;
      allowNextRemoval.current = true;
      navigate();
      queueMicrotask(() => {
        allowNextRemoval.current = false;
      });
    },
    hasLeft: () => left.current,
  };
}
