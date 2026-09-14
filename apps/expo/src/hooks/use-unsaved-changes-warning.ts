import { useRef } from "react";
import { Alert } from "react-native";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";

export default function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const allowNextRemoval = useRef(false);

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

  return (navigate: () => void) => {
    allowNextRemoval.current = true;
    navigate();
    queueMicrotask(() => {
      allowNextRemoval.current = false;
    });
  };
}
