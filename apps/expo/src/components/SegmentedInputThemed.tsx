import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useNativeVariable } from "react-native-css";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";

import type { variantClasses } from "./Card";
import Card from "./Card";
import PressableThemed from "./PressableThemed";
import { AnimatedTextStyled } from "./Styled";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
  accessibilityLabel?: string;
  tone?: "primary" | "muted" | "destructive" | "info";
}

const slideDuration = 400;
const colorDuration = 600;

function OptionLabel({
  label,
  color,
  selected,
}: {
  label: string;
  color: string;
  selected: boolean;
}) {
  const animatedColor = useSharedValue(color);
  const style = useAnimatedStyle(() => ({ color: animatedColor.value }));

  useEffect(() => {
    animatedColor.set(withTiming(color, { duration: colorDuration }));
  }, [animatedColor, color]);

  return (
    <AnimatedTextStyled
      allowFontScaling={false}
      numberOfLines={1}
      className={twMerge("text-xl", selected && "font-bold")}
      style={style}
    >
      {label}
    </AnimatedTextStyled>
  );
}

interface SegmentedInputThemedProps<T extends string> {
  label: string;
  value?: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  animateOnPress?: boolean;
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
  animateOnPress = true,
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
  const primaryColor = useNativeVariable("--primary") as string;
  const mutedColor = useNativeVariable("--muted") as string;
  const infoColor = useNativeVariable("--info") as string;
  const destructiveColor = useNativeVariable("--destructive") as string;
  const foregroundColor = useNativeVariable("--foreground") as string;
  const primaryForeground = useNativeVariable("--primary-foreground") as string;
  const mutedForeground = useNativeVariable("--muted-foreground") as string;
  const infoForeground = useNativeVariable("--info-foreground") as string;
  const destructiveForeground = useNativeVariable(
    "--destructive-foreground",
  ) as string;
  const colors = {
    primary: primaryColor,
    muted: mutedColor,
    info: infoColor,
    destructive: destructiveColor,
  };
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];
  const selectedColor = colors[selectedOption?.tone ?? "primary"];
  const foregroundColors = {
    primary: primaryForeground,
    muted: mutedForeground,
    info: infoForeground,
    destructive: destructiveForeground,
  };
  const square = cardVariants?.includes("square") ?? false;
  const [layouts, setLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});
  const selectedLayout = selectedOption
    ? layouts[selectedOption.value]
    : undefined;
  const initialized = useRef(false);
  const pressedTarget = useRef<{
    value: T;
    x: number;
    width: number;
    color: string;
    radius: number;
  } | null>(null);
  const highlightX = useSharedValue(0);
  const highlightWidth = useSharedValue(0);
  const highlightColor = useSharedValue(selectedColor);
  const highlightRadius = useSharedValue(0);
  const highlightStyle = useAnimatedStyle(() => ({
    width: highlightWidth.value,
    transform: [{ translateX: highlightX.value }],
    backgroundColor: highlightColor.value,
    borderTopRightRadius: highlightRadius.value,
    borderBottomRightRadius: highlightRadius.value,
  }));

  useEffect(() => {
    if (!selectedLayout) return;
    const radius = !square && selectedIndex === options.length - 1 ? 24 : 0;
    const pressed = pressedTarget.current;
    pressedTarget.current = null;
    if (
      pressed &&
      pressed.value === value &&
      pressed.x === selectedLayout.x &&
      pressed.width === selectedLayout.width &&
      pressed.color === selectedColor &&
      pressed.radius === radius
    ) {
      return;
    }
    if (!initialized.current) {
      highlightX.set(selectedLayout.x);
      highlightWidth.set(selectedLayout.width);
      highlightColor.set(selectedColor);
      highlightRadius.set(radius);
      initialized.current = true;
      return;
    }
    highlightX.set(withTiming(selectedLayout.x, { duration: slideDuration }));
    highlightWidth.set(
      withTiming(selectedLayout.width, { duration: slideDuration }),
    );
    highlightColor.set(withTiming(selectedColor, { duration: colorDuration }));
    highlightRadius.set(withTiming(radius, { duration: slideDuration }));
  }, [
    highlightColor,
    highlightRadius,
    highlightWidth,
    highlightX,
    options.length,
    selectedColor,
    selectedIndex,
    selectedLayout,
    square,
    value,
  ]);

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
                allowFontScaling={false}
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
              allowFontScaling={false}
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
          {selectedLayout ? (
            <Animated.View
              pointerEvents="none"
              style={[
                { position: "absolute", top: 4, bottom: 4, left: 0 },
                highlightStyle,
              ]}
            />
          ) : null}
          {options.map((option) => {
            const selected = value === option.value;

            return (
              <View
                key={option.value}
                className="flex-1"
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  setLayouts((previous) => {
                    const current = previous[option.value];
                    return current?.x === x && current.width === width
                      ? previous
                      : { ...previous, [option.value]: { x, width } };
                  });
                }}
              >
                <PressableThemed
                  className="h-full flex-row items-stretch"
                  onPress={() => {
                    const layout = layouts[option.value];
                    if (
                      animateOnPress &&
                      initialized.current &&
                      layout &&
                      (option.value !== value || pressedTarget.current)
                    ) {
                      const color = colors[option.tone ?? "primary"];
                      const radius =
                        !square && option === options[options.length - 1]
                          ? 24
                          : 0;
                      pressedTarget.current =
                        option.value === value
                          ? null
                          : { value: option.value, ...layout, color, radius };
                      highlightX.set(
                        withTiming(layout.x, { duration: slideDuration }),
                      );
                      highlightWidth.set(
                        withTiming(layout.width, { duration: slideDuration }),
                      );
                      highlightColor.set(
                        withTiming(color, { duration: colorDuration }),
                      );
                      highlightRadius.set(
                        withTiming(radius, { duration: slideDuration }),
                      );
                    }
                    onChange(option.value);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={option.accessibilityLabel ?? option.label}
                  accessibilityState={{ checked: selected }}
                >
                  <View
                    className={twMerge(
                      hasThreeOptions
                        ? "h-full w-full items-center justify-center px-1.5 py-2"
                        : "h-full w-full items-center justify-center px-3 py-2",
                    )}
                  >
                    <OptionLabel
                      label={option.label}
                      selected={selected}
                      color={
                        selected
                          ? foregroundColors[option.tone ?? "primary"]
                          : foregroundColor
                      }
                    />
                  </View>
                </PressableThemed>
              </View>
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
