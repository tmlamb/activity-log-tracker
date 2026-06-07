import type { PressableProps, View } from "react-native";
import { Pressable } from "react-native";
import { twMerge } from "tailwind-merge";

export const pressableVariant = {
  default: "",
};

type PressableThemedProps = {
  className?: string;
  variant?: keyof typeof pressableVariant;
  animated?: boolean;
  ref?: React.Ref<View>;
} & PressableProps;

export default function PressableThemed({
  children,
  className,
  variant = "default",
  animated = true,
  onPress,
  disabled,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessibilityValue,
  ref,
}: PressableThemedProps) {
  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      onPress={onPress}
      className={twMerge(
        animated
          ? "opacity-100 transition-opacity active:opacity-60"
          : "opacity-100",
        pressableVariant[variant],
        className,
      )}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        accessibilityState ?? (disabled ? { disabled: true } : undefined)
      }
      accessibilityValue={accessibilityValue}
    >
      {children}
    </Pressable>
  );
}
