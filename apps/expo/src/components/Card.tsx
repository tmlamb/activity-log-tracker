import type { AccessibilityState } from "react-native";
import { View } from "react-native";
import { LinearTransition } from "react-native-reanimated";
import { twMerge } from "tailwind-merge";

import type { CardGlassEffectStyle } from "./CardGlassBackground";
import CardGlassBackground from "./CardGlassBackground";
import { AnimatedViewStyled } from "./Styled";

export const variantClasses = {
  glass: "",
  transparent: "bg-transparent",
  square: "rounded-none",
  small: "h-[45px] py-2.5",
  multiline: "h-auto min-h-[53px] py-0",
};

const cardLayoutTransition = LinearTransition.duration(80);

interface CardProps {
  children: React.ReactNode;
  className?: string;
  layout?: React.ComponentProps<typeof AnimatedViewStyled>["layout"] | null;
  variants?: (keyof typeof variantClasses)[];
  glassEffectStyle?: CardGlassEffectStyle;
  nativeGlassButton?: {
    label: string;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
    overlay?: React.ReactNode;
  };
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  stack?: {
    index: number;
    size: number;
  };
}

export default function Card({
  children,
  className,
  layout = cardLayoutTransition,
  variants = [],
  glassEffectStyle,
  nativeGlassButton,
  accessible = false,
  accessibilityLabel,
  accessibilityState,
  stack,
}: CardProps) {
  const isGlass = variants.includes("glass");
  const contentClassName =
    "relative h-full w-full flex-row items-center justify-between gap-2 px-5 py-4";
  const nativeContentClassName =
    "relative w-full flex-row items-center justify-between gap-2 px-2";

  const cardClassName = twMerge(
    isGlass ? "overflow-hidden" : "bg-card",
    isGlass ? "h-[53px]" : "h-[53px]",
    "w-full rounded-4xl",
    isGlass ? "" : "flex-row items-center justify-between gap-2 px-5 py-4",
    ...variants.map((variant) => variantClasses[variant]),
    stack
      ? [
          "rounded-none",
          stack.index === 0 && !variants.includes("square")
            ? "rounded-t-4xl"
            : "",
          stack.index === stack.size - 1
            ? [variants.includes("square") ? "" : "rounded-b-4xl", "border-b-0"]
            : "",
        ]
      : [],
    className,
  );

  return (
    <AnimatedViewStyled
      layout={layout ?? undefined}
      className={cardClassName}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
    >
      {isGlass ? (
        <CardGlassBackground
          glassEffectStyle={glassEffectStyle ?? { style: "regular" }}
          contentClassName={contentClassName}
          nativeContentClassName={nativeContentClassName}
          nativeGlassButton={nativeGlassButton}
        >
          {children}
        </CardGlassBackground>
      ) : (
        children
      )}
      {stack && stack.index > 0 ? (
        <View
          className={twMerge(
            "bg-border absolute top-0 right-5 left-5 h-px",
            variants.includes("square") ? "right-0 left-0" : "",
          )}
        />
      ) : null}
    </AnimatedViewStyled>
  );
}
