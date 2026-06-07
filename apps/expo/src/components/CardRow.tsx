import type { PressableProps } from "react-native";
import { Text, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import type { variantClasses } from "./Card";
import Card from "./Card";
import PressableThemed from "./PressableThemed";

interface CardRowStack {
  index: number;
  size: number;
}

interface DetailCardRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  stack?: CardRowStack;
  cardVariants?: (keyof typeof variantClasses)[];
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  valueNumberOfLines?: number;
}

export function DetailCardRow({
  label,
  value,
  stack,
  cardVariants,
  className,
  labelClassName,
  valueClassName,
  valueNumberOfLines,
}: DetailCardRowProps) {
  return (
    <Card stack={stack} variants={cardVariants} className={className}>
      <Text
        maxFontSizeMultiplier={2.5}
        className={twMerge("text-foreground pr-3 text-xl", labelClassName)}
      >
        {label}
      </Text>
      <Text
        maxFontSizeMultiplier={2.5}
        className={twMerge(
          "text-muted flex-1 text-right text-xl",
          valueClassName,
        )}
        numberOfLines={valueNumberOfLines}
      >
        {value}
      </Text>
    </Card>
  );
}

interface NavigationCardRowProps extends PressableProps {
  title: React.ReactNode;
  stack?: CardRowStack;
  cardVariants?: (keyof typeof variantClasses)[];
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  titleNumberOfLines?: number;
  trailingText?: React.ReactNode;
  trailingTextClassName?: string;
  showChevron?: boolean;
}

export function NavigationCardRow({
  title,
  stack,
  cardVariants,
  className,
  cardClassName,
  titleClassName,
  titleNumberOfLines = 1,
  trailingText,
  trailingTextClassName,
  showChevron = true,
  ...pressableProps
}: NavigationCardRowProps) {
  return (
    <PressableThemed className={className} {...pressableProps}>
      <Card stack={stack} variants={cardVariants} className={cardClassName}>
        <Text
          maxFontSizeMultiplier={2.5}
          className={twMerge(
            "text-foreground flex-1 pr-2.5 text-xl",
            titleClassName,
          )}
          numberOfLines={titleNumberOfLines}
        >
          {title}
        </Text>
        {(trailingText != null || showChevron) && (
          <View className="flex-row items-center justify-end gap-1">
            {trailingText != null ? (
              <Text
                maxFontSizeMultiplier={2.5}
                className={twMerge("text-muted text-xl", trailingTextClassName)}
              >
                {trailingText}
              </Text>
            ) : null}
            {showChevron ? (
              <Text maxFontSizeMultiplier={2.5} className="text-muted">
                <AntDesign name="right" size={15} />
              </Text>
            ) : null}
          </View>
        )}
      </Card>
    </PressableThemed>
  );
}

interface SelectableCardRowProps extends PressableProps {
  title: React.ReactNode;
  selected: boolean;
  stack?: CardRowStack;
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  titleNumberOfLines?: number;
  trailingText?: React.ReactNode;
  trailingTextClassName?: string;
}

interface PrimaryCardActionProps extends PressableProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  stack?: CardRowStack;
  className?: string;
  cardClassName?: string;
  cardVariants?: (keyof typeof variantClasses)[];
  labelClassName?: string;
  iconClassName?: string;
}

export function PrimaryCardAction({
  label,
  icon,
  stack,
  className,
  cardClassName,
  cardVariants,
  labelClassName,
  iconClassName,
  ...pressableProps
}: PrimaryCardActionProps) {
  return (
    <PressableThemed className={className} {...pressableProps}>
      <Card
        stack={stack}
        variants={cardVariants}
        className={twMerge(icon ? "justify-start" : undefined, cardClassName)}
      >
        {icon != null ? (
          <Text
            maxFontSizeMultiplier={2.5}
            className={twMerge("text-primary text-xl", iconClassName)}
          >
            {icon}
          </Text>
        ) : null}
        <Text
          maxFontSizeMultiplier={2.5}
          className={twMerge(
            "text-primary text-xl",
            icon ? "px-3" : null,
            labelClassName,
          )}
        >
          {label}
        </Text>
      </Card>
    </PressableThemed>
  );
}

export function SelectableCardRow({
  title,
  selected,
  stack,
  className,
  cardClassName,
  titleClassName,
  titleNumberOfLines = 1,
  trailingText,
  trailingTextClassName,
  ...pressableProps
}: SelectableCardRowProps) {
  return (
    <PressableThemed className={className} {...pressableProps}>
      <Card stack={stack} className={cardClassName}>
        <Text
          maxFontSizeMultiplier={2.5}
          className={twMerge(
            "text-foreground flex-1 pr-6 text-xl",
            titleClassName,
          )}
          numberOfLines={titleNumberOfLines}
        >
          {title}
        </Text>
        <View className="flex-row items-center justify-end gap-3">
          {trailingText != null ? (
            <Text
              maxFontSizeMultiplier={2.5}
              className={twMerge("text-muted text-xl", trailingTextClassName)}
            >
              {trailingText}
            </Text>
          ) : null}
          <Text
            maxFontSizeMultiplier={2.5}
            className="text-primary w-6 text-right text-xl"
          >
            {selected ? <AntDesign name="check" size={22} /> : null}
          </Text>
        </View>
      </Card>
    </PressableThemed>
  );
}
