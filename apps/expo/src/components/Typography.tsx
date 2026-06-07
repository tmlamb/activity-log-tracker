import type { TextProps } from "react-native";
import { Text } from "react-native";
import { twMerge } from "tailwind-merge";

type TypographyProps = TextProps & {
  className?: string;
};

type SectionHeadingPlacement =
  | "default"
  | "inset"
  | "flush"
  | "inline"
  | "inlineInset"
  | "description";

type HelperTextPlacement =
  | "default"
  | "blockStart"
  | "listHeader"
  | "formInset"
  | "beforeCard"
  | "tight";

const sectionHeadingPlacementClasses: Record<SectionHeadingPlacement, string> =
  {
    default: "mb-2 ml-5",
    inset: "mx-5 mb-2",
    flush: "mb-2 ml-0",
    inline: "mb-0 ml-0",
    inlineInset: "mb-0 pb-2 pl-5",
    description: "mb-1.5 ml-0",
  };

const helperTextPlacementClasses: Record<HelperTextPlacement, string> = {
  default: "mx-5 mt-2",
  blockStart: "mx-5 mt-0",
  listHeader: "mt-0 mr-0 mb-2 ml-5",
  formInset: "mx-0 mt-0 px-5 leading-tight",
  beforeCard: "mx-5 mt-0 mb-2",
  tight: "mx-5 mt-2 leading-tight",
};

export function ScreenHeading({
  className,
  maxFontSizeMultiplier = 2.5,
  ...props
}: TypographyProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={twMerge(
        "text-foreground mt-8 text-2xl font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  className,
  placement = "default",
  maxFontSizeMultiplier = 2.5,
  ...props
}: TypographyProps & { placement?: SectionHeadingPlacement }) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={twMerge(
        "text-muted text-xl font-semibold",
        sectionHeadingPlacementClasses[placement],
        className,
      )}
      {...props}
    />
  );
}

export function HelperText({
  className,
  placement = "default",
  maxFontSizeMultiplier = 2.5,
  ...props
}: TypographyProps & { placement?: HelperTextPlacement }) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={twMerge(
        "text-muted text-base",
        helperTextPlacementClasses[placement],
        className,
      )}
      {...props}
    />
  );
}
