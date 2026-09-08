import type { PressableProps } from "react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
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
  trailingAccessory?: React.ReactNode;
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
  trailingAccessory,
}: DetailCardRowProps) {
  const multilineEnabled = cardVariants?.includes("multiline") ?? false;

  if (multilineEnabled) {
    // Keep each text item atomic so native flex layout wraps the whole value.
    return (
      <Card stack={stack} variants={cardVariants} className={className}>
        <View className="w-full flex-row items-start gap-2">
          <View className="min-w-0 flex-1 flex-row flex-wrap items-baseline justify-between gap-x-5 gap-y-0.5 py-3">
            <Text
              maxFontSizeMultiplier={2.5}
              className={twMerge(
                "text-foreground max-w-full shrink-0 text-xl",
                labelClassName,
              )}
            >
              {label}
            </Text>
            <Text
              maxFontSizeMultiplier={2.5}
              className={twMerge(
                "text-muted max-w-full shrink-0 pb-0.5 text-left text-xl leading-tight",
                valueClassName,
              )}
              numberOfLines={valueNumberOfLines}
            >
              {value}
            </Text>
          </View>
          {trailingAccessory != null ? (
            <View className="shrink-0 py-4">{trailingAccessory}</View>
          ) : null}
        </View>
      </Card>
    );
  }

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
      {trailingAccessory}
    </Card>
  );
}

interface NavigationCardRowProps extends PressableProps {
  title: React.ReactNode;
  leadingText?: React.ReactNode;
  leadingTextClassName?: string;
  stack?: CardRowStack;
  cardVariants?: (keyof typeof variantClasses)[];
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  titleNumberOfLines?: number;
  centerTextLines?: readonly [React.ReactNode, React.ReactNode?];
  centerTextClassName?: string;
  centerTextColumnWidth?: number;
  trailingText?: React.ReactNode;
  trailingTextClassName?: string;
  animateTrailingText?: boolean;
  trailingTextAnimationKey?: string;
  showChevron?: boolean;
}

const centerTextLayoutTransition = LinearTransition.duration(180);

export function NavigationCardRow({
  title,
  leadingText,
  leadingTextClassName,
  stack,
  cardVariants,
  className,
  cardClassName,
  titleClassName,
  titleNumberOfLines,
  centerTextLines,
  centerTextClassName,
  centerTextColumnWidth,
  trailingText,
  trailingTextClassName,
  animateTrailingText = false,
  trailingTextAnimationKey,
  showChevron = true,
  ...pressableProps
}: NavigationCardRowProps) {
  const multilineEnabled = cardVariants?.includes("multiline") ?? false;
  const titlePaddingClassName = multilineEnabled
    ? "pt-4.5 pb-5 leading-tight"
    : undefined;
  const titleText = (
    <Text
      maxFontSizeMultiplier={2.5}
      className={twMerge(
        "text-foreground min-w-0 flex-1 pr-2.5 text-xl",
        titlePaddingClassName,
        titleClassName,
      )}
      numberOfLines={titleNumberOfLines ?? (multilineEnabled ? undefined : 1)}
    >
      {title}
    </Text>
  );

  return (
    <PressableThemed className={className} {...pressableProps}>
      <Card stack={stack} variants={cardVariants} className={cardClassName}>
        {leadingText != null ? (
          <View className="min-w-0 flex-1 flex-row items-start gap-4">
            <Text
              maxFontSizeMultiplier={2.5}
              className={twMerge(
                "text-muted shrink-0 self-center text-xl",
                titlePaddingClassName,
                leadingTextClassName,
              )}
              numberOfLines={1}
            >
              {leadingText}
            </Text>
            {titleText}
          </View>
        ) : (
          titleText
        )}
        {(centerTextLines != null || trailingText != null || showChevron) && (
          <View className="flex-row items-center justify-end">
            {centerTextLines != null ? (
              <Animated.View
                layout={centerTextLayoutTransition}
                className="h-[53px] justify-center pr-5"
              >
                <Animated.View
                  layout={centerTextLayoutTransition}
                  className="items-start"
                  style={
                    centerTextColumnWidth != null
                      ? { width: centerTextColumnWidth }
                      : undefined
                  }
                >
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className={twMerge(
                      "text-muted text-left text-lg leading-none",
                      centerTextClassName,
                    )}
                    numberOfLines={1}
                  >
                    {centerTextLines[0]}
                  </Text>
                  {centerTextLines[1] != null ? (
                    <Text
                      maxFontSizeMultiplier={2.5}
                      className={twMerge(
                        "text-muted text-left text-lg leading-none",
                        centerTextClassName,
                      )}
                      numberOfLines={1}
                    >
                      {centerTextLines[1]}
                    </Text>
                  ) : null}
                </Animated.View>
              </Animated.View>
            ) : null}
            {trailingText != null ? (
              animateTrailingText ? (
                <Animated.Text
                  key={trailingTextAnimationKey}
                  entering={FadeIn.duration(250)}
                  exiting={FadeOut.duration(250)}
                  maxFontSizeMultiplier={2.5}
                  className={twMerge(
                    "text-muted text-xl",
                    trailingTextClassName,
                  )}
                >
                  {trailingText}
                </Animated.Text>
              ) : (
                <Text
                  maxFontSizeMultiplier={2.5}
                  className={twMerge(
                    "text-muted text-xl",
                    trailingTextClassName,
                  )}
                >
                  {trailingText}
                </Text>
              )
            ) : null}
            {showChevron ? (
              <Text maxFontSizeMultiplier={2.5} className="text-muted ml-1">
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
  cardVariants?: (keyof typeof variantClasses)[];
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  titleNumberOfLines?: number;
  trailingText?: React.ReactNode;
  trailingTextClassName?: string;
  trailingAccessory?: React.ReactNode;
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
  cardVariants,
  className,
  cardClassName,
  titleClassName,
  titleNumberOfLines,
  trailingText,
  trailingTextClassName,
  trailingAccessory,
  ...pressableProps
}: SelectableCardRowProps) {
  const multilineEnabled = cardVariants?.includes("multiline") ?? false;
  const [titleIsMultiline, setTitleIsMultiline] = useState(false);

  return (
    <PressableThemed className={className} {...pressableProps}>
      <Card stack={stack} variants={cardVariants} className={cardClassName}>
        <Text
          maxFontSizeMultiplier={2.5}
          className="text-primary w-6 text-left text-xl"
        >
          {selected ? <AntDesign name="check" size={20} /> : null}
        </Text>
        <Text
          maxFontSizeMultiplier={2.5}
          className={twMerge(
            "text-foreground flex-1 pr-2.5 text-xl",
            multilineEnabled
              ? titleIsMultiline
                ? "py-4.5 leading-tight"
                : "py-3"
              : undefined,
            titleClassName,
          )}
          numberOfLines={
            titleNumberOfLines ?? (multilineEnabled ? undefined : 1)
          }
          onTextLayout={
            multilineEnabled
              ? (event) =>
                  setTitleIsMultiline(event.nativeEvent.lines.length > 1)
              : undefined
          }
        >
          {title}
        </Text>
        {(trailingText != null || trailingAccessory != null) && (
          <View className="flex-row items-center justify-end gap-3">
            {trailingText != null ? (
              <Text
                maxFontSizeMultiplier={2.5}
                className={twMerge("text-muted text-xl", trailingTextClassName)}
              >
                {trailingText}
              </Text>
            ) : null}
            {trailingAccessory}
          </View>
        )}
      </Card>
    </PressableThemed>
  );
}
