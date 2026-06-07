import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { twMerge } from "tailwind-merge";

import type { variantClasses } from "./Card";
import Card from "./Card";
import PressableThemed from "./PressableThemed";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
  accessibilityLabel?: string;
  tone?: "primary" | "muted" | "destructive";
}

const selectedOptionToneClasses = {
  primary: { container: "bg-primary", text: "text-primary-foreground" },
  muted: { container: "bg-muted-foreground", text: "text-foreground" },
  destructive: {
    container: "bg-destructive",
    text: "text-destructive-foreground",
  },
};

interface SegmentedInputThemedProps<T extends string> {
  label: string;
  value?: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  className?: string;
  labelContainerClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  cardVariants?: (keyof typeof variantClasses)[];
  accessibilityLabel?: string;
  optionsClassName?: string;
  compact?: boolean;
  stack?: {
    index: number;
    size: number;
  };
}

export default function SegmentedInputThemed<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  className,
  labelContainerClassName,
  labelClassName,
  errorClassName,
  cardVariants,
  accessibilityLabel,
  optionsClassName,
  compact = false,
  stack,
}: SegmentedInputThemedProps<T>) {
  const hasThreeOptions = options.length >= 3;

  return (
    <View>
      <Card
        stack={stack}
        variants={cardVariants}
        className={twMerge(
          error ? "border-destructive border" : null,
          "py-0 pr-0 pl-5",
          className,
        )}
      >
        {hasThreeOptions ? (
          <View
            className={twMerge(
              "h-full min-w-0 basis-0",
              labelContainerClassName,
            )}
            style={{ flex: 0.34 }}
          >
            <View className="h-full justify-center">
              <Text
                maxFontSizeMultiplier={2}
                numberOfLines={1}
                className={twMerge(
                  error
                    ? "text-destructive text-xl tracking-tight"
                    : "text-muted text-xl tracking-tight",
                  labelClassName,
                )}
                accessible={false}
              >
                {label}
              </Text>
            </View>
          </View>
        ) : (
          <View
            className={twMerge(
              compact
                ? "absolute top-0 bottom-0 left-5 z-1 max-w-[35%] flex-row items-center"
                : "absolute top-0 bottom-0 left-5 z-1 max-w-[45%] flex-row items-center",
              labelContainerClassName,
            )}
            pointerEvents="none"
          >
            <Text
              maxFontSizeMultiplier={2}
              numberOfLines={1}
              className={twMerge(
                error
                  ? "text-destructive text-xl tracking-tight"
                  : "text-muted text-xl tracking-tight",
                labelClassName,
              )}
              accessible={false}
            >
              {label}
            </Text>
          </View>
        )}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={accessibilityLabel ?? label}
          className={twMerge(
            hasThreeOptions
              ? "h-full min-w-0 flex-1 flex-row gap-1 overflow-hidden p-1"
              : compact
                ? "ml-auto h-full w-[62%] flex-row gap-1 overflow-hidden p-1"
                : "ml-auto h-full w-1/2 flex-row gap-1 overflow-hidden p-1",
            error ? "bg-destructive" : "bg-card",
            cardVariants?.includes("square")
              ? "rounded-none"
              : "rounded-tr-4xl rounded-br-4xl",
            stack
              ? [
                  "rounded-none",
                  stack.index === 0
                    ? cardVariants?.includes("square")
                      ? ""
                      : "rounded-tr-4xl"
                    : "",
                  stack.index === stack.size - 1
                    ? cardVariants?.includes("square")
                      ? ""
                      : "rounded-br-4xl"
                    : "",
                ]
              : [],
            optionsClassName,
          )}
        >
          {options.map((option) => {
            const selected = value === option.value;
            const isLastOption =
              option.value === options[options.length - 1]?.value;

            return (
              <PressableThemed
                key={option.value}
                className="flex-1 flex-row items-stretch"
                onPress={() => onChange(option.value)}
                accessibilityRole="radio"
                accessibilityLabel={option.accessibilityLabel ?? option.label}
                accessibilityState={{ checked: selected }}
              >
                <View
                  className={twMerge(
                    hasThreeOptions
                      ? "h-full w-full items-center justify-center px-1.5 py-2"
                      : "h-full w-full items-center justify-center px-3 py-2",
                    selected
                      ? selectedOptionToneClasses[option.tone ?? "primary"]
                          .container
                      : "bg-transparent",
                    cardVariants?.includes("square")
                      ? "rounded-none"
                      : isLastOption
                        ? "rounded-tr-3xl rounded-br-3xl"
                        : "rounded-none",
                  )}
                >
                  <Text
                    maxFontSizeMultiplier={2.5}
                    numberOfLines={1}
                    className={twMerge(
                      selected
                        ? twMerge(
                            selectedOptionToneClasses[option.tone ?? "primary"]
                              .text,
                            "font-bold",
                          )
                        : "text-foreground",
                      hasThreeOptions ? "text-xl" : "text-xl",
                    )}
                  >
                    {option.label}
                  </Text>
                </View>
              </PressableThemed>
            );
          })}
        </View>
      </Card>

      {error ? (
        <Animated.View
          entering={FadeInDown.springify().stiffness(40).damping(6).mass(0.3)}
          exiting={FadeOutDown.springify().stiffness(40).damping(6).mass(0.3)}
          className={twMerge("px-5 pt-2", errorClassName)}
          pointerEvents="none"
        >
          <Text
            accessibilityRole="alert"
            maxFontSizeMultiplier={2}
            className="text-destructive text-sm"
          >
            {error}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
