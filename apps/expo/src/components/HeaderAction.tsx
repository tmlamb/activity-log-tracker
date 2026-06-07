import type { PressableProps } from "react-native";
import { Text } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

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
      className={twMerge("px-3.5", className)}
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

export function HeaderPlusAction(
  props: Omit<HeaderIconActionProps, "children">,
) {
  return (
    <HeaderIconAction {...props}>
      <Text maxFontSizeMultiplier={2.5} className="text-primary leading-none">
        <AntDesign name="plus" size={26} />
      </Text>
    </HeaderIconAction>
  );
}
