import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNativeVariable } from "react-native-css";
import { easeGradient } from "react-native-easing-gradient";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";
import { twMerge } from "tailwind-merge";

import Card from "./Card";
import PressableThemed from "./PressableThemed";
import { AnimatedTextStyled } from "./Styled";

const defaultAnimationDuration = 250;
const hiddenTranslateY = 24;

interface BottomActionBarProps {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  glassVisible?: boolean;
  textStyle?: React.ComponentProps<typeof AnimatedTextStyled>["style"];
  visible?: boolean;
  animationDuration?: number;
}

export default function BottomActionBar({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  className,
  buttonClassName,
  glassVisible = true,
  textStyle,
  visible = true,
  animationDuration = defaultAnimationDuration,
}: BottomActionBarProps) {
  const backgroundColor = useNativeVariable("--background") as string;
  const [shouldRender, setShouldRender] = useState(visible);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const progress = useDerivedValue(() =>
    withTiming(visible ? 1 : 0, { duration: animationDuration }),
  );
  const coverAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));
  const actionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * hiddenTranslateY }],
  }));
  const { colors, locations } = easeGradient({
    colorStops: {
      1: { color: "rgba(0,0,0,0.75)" },
      0.85: { color: "rgba(0,0,0,0.75)" },
      0.55: { color: "rgba(0,0,0,0.4)" },
      0: { color: "transparent" },
    },
  });
  const maskGradientStyle = {
    experimental_backgroundImage: `linear-gradient(to bottom, ${colors
      .map((color, index) => `${color} ${(locations[index] ?? 0) * 100}%`)
      .join(", ")})`,
  };

  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }

    if (visible) {
      if (!shouldRender) {
        renderTimeoutRef.current = setTimeout(() => {
          setShouldRender(true);
          renderTimeoutRef.current = null;
        }, 0);
      }
    } else if (shouldRender) {
      renderTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        renderTimeoutRef.current = null;
      }, animationDuration);
    }

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
    };
  }, [animationDuration, shouldRender, visible]);

  if (!shouldRender) {
    return null;
  }

  const coverOverlay = (
    <Animated.View
      pointerEvents="none"
      style={[styles.coverOverlay, { backgroundColor }, coverAnimatedStyle]}
    />
  );

  return (
    <View
      accessibilityElementsHidden={!visible}
      className={className}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <View className="flex-1">
            <View style={[StyleSheet.absoluteFill, maskGradientStyle]} />
          </View>
        }
      >
        <View className="bg-background flex-1 overflow-hidden" />
      </MaskedView>
      <Animated.View style={actionAnimatedStyle}>
        <PressableThemed
          onPress={onPress}
          disabled={disabled || !visible}
          accessibilityLabel={accessibilityLabel}
          animated={false}
          className={twMerge("mx-8 my-8", buttonClassName)}
        >
          <Card
            variants={["glass"]}
            layout={null}
            glassEffectStyle={{
              style: glassVisible ? "regular" : "none",
              animate: false,
            }}
            nativeGlassButton={{
              label,
              onPress,
              accessibilityLabel,
              disabled: disabled || !visible,
              overlay: coverOverlay,
            }}
          >
            {coverOverlay}
            <AnimatedTextStyled
              maxFontSizeMultiplier={2.5}
              className="text-primary text-xl"
              style={textStyle}
            >
              {label}
            </AnimatedTextStyled>
          </Card>
        </PressableThemed>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    borderRadius: 32,
  },
});
