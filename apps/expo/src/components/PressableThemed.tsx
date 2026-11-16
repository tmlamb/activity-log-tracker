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
  className,
  variant = "default",
  animated = true,
  disabled,
  accessibilityRole,
  accessibilityState,
  // `<Link asChild>` injects web link semantics. `role` would override the
  // native button role below, so keep announcing these as buttons.
  role: _role,
  href: _href,
  ...pressableProps
}: PressableThemedProps & { href?: string }) {
  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      className={twMerge(
        animated
          ? "opacity-100 transition-opacity active:opacity-60"
          : "opacity-100",
        pressableVariant[variant],
        className,
      )}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityState={
        accessibilityState ?? (disabled ? { disabled: true } : undefined)
      }
    />
  );
}
