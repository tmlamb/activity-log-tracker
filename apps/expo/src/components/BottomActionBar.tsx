import { useNativeVariable } from "react-native-css";
import { Stack } from "expo-router";

interface BottomActionBarProps {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  hidden?: boolean;
}

export default function BottomActionBar({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  hidden = false,
}: BottomActionBarProps) {
  const primaryColor = useNativeVariable("--primary") as string;

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        accessibilityLabel={accessibilityLabel}
        disabled={disabled || hidden}
        hidden={hidden}
        onPress={onPress}
        separateBackground
        tintColor={primaryColor}
        variant="plain"
        style={{}}
      >
        {label}
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
    </Stack.Toolbar>
  );
}
