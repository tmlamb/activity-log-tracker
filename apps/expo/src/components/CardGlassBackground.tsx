import { View } from "react-native";
import { twMerge } from "tailwind-merge";

export interface CardGlassEffectStyle {
  style?: "regular" | "clear" | "none";
  animate?: boolean;
  animationDuration?: number;
}

interface CardGlassBackgroundProps {
  glassEffectStyle?: CardGlassEffectStyle;
  children?: React.ReactNode;
  contentClassName?: string;
  nativeContentClassName?: string;
  nativeGlassButton?: {
    label: string;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
    overlay?: React.ReactNode;
  };
}

export function isCardLiquidGlassAvailable() {
  return false;
}

export default function CardGlassBackground({
  glassEffectStyle,
  children,
  contentClassName,
  nativeContentClassName: _nativeContentClassName,
  nativeGlassButton: _nativeGlassButton,
}: CardGlassBackgroundProps) {
  return (
    <View
      className={twMerge(
        "h-full w-full",
        glassEffectStyle?.style === "none" ? "" : "bg-card",
        contentClassName,
      )}
    >
      {children}
    </View>
  );
}
