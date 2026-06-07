import { Alert, Text } from "react-native";

import type { variantClasses } from "./Card";
import Card from "./Card";
import PressableThemed from "./PressableThemed";

interface Props {
  className?: string;
  onConfirm: () => void;
  accessibilityLabel: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  children: React.ReactNode;
  cardVariants?: (keyof typeof variantClasses)[];
}

export default function ConfirmButton({
  className,
  onConfirm,
  accessibilityLabel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  children,
  cardVariants,
}: Props) {
  return (
    <PressableThemed
      onPress={() => {
        Alert.alert(title, message, [
          { text: cancelText, style: "cancel" },
          {
            text: confirmText,
            style: "destructive",
            onPress: onConfirm,
          },
        ]);
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Card className={className} variants={cardVariants}>
        <Text maxFontSizeMultiplier={2.5} className="text-destructive text-xl">
          {children}
        </Text>
      </Card>
    </PressableThemed>
  );
}
