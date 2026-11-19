import { useRef } from "react";
import { Alert } from "react-native";

import type { variantClasses } from "./Card";
import Card from "./Card";
import { Text } from "./font-scale-text";
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
  // A quick second tap would queue a second confirmation behind the first.
  const open = useRef(false);
  const close = () => {
    open.current = false;
  };
  return (
    <PressableThemed
      onPress={() => {
        if (open.current) return;
        open.current = true;
        Alert.alert(
          title,
          message,
          [
            { text: cancelText, style: "cancel", onPress: close },
            {
              text: confirmText,
              style: "destructive",
              onPress: () => {
                close();
                onConfirm();
              },
            },
          ],
          { onDismiss: close },
        );
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
