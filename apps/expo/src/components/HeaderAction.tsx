import type { PressableProps } from "react-native";
import { twMerge } from "tailwind-merge";

import { Text } from "./font-scale-text";
import PressableThemed from "./PressableThemed";

interface HeaderTextActionProps extends PressableProps {
  label: string;
  color?: "foreground" | "primary";
  weight?: "regular" | "bold";
  className?: string;
  textClassName?: string;
}

export function HeaderTextAction({
  label,
  color = "primary",
  weight = "regular",
  className,
  textClassName,
  ...pressableProps
}: HeaderTextActionProps) {
  return (
    <PressableThemed
      // Fill the native header item's height (like HeaderIconAction) so taps
      // above or below the text still press the button. `min-h` lets large
      // font scales grow it.
      className={twMerge(
        "min-h-10 flex-row items-center justify-center px-3.5",
        className,
      )}
      {...pressableProps}
    >
      <Text
        maxFontSizeMultiplier={2.5}
        className={twMerge(
          color === "primary" ? "text-primary" : "text-foreground",
          "text-xl",
          weight === "bold" ? "font-bold" : null,
          textClassName,
        )}
      >
        {label}
      </Text>
    </PressableThemed>
  );
}

interface HeaderIconActionProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
}

export function HeaderIconAction({
  children,
  className,
  ...pressableProps
}: HeaderIconActionProps) {
  return (
    <PressableThemed
      className={twMerge(
        "flex h-10 w-10 flex-row items-center justify-center",
        className,
      )}
      {...pressableProps}
    >
      {children}
    </PressableThemed>
  );
}
