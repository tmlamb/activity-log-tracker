import type { LayoutChangeEvent } from "react-native";
import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useNativeVariable } from "react-native-css";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Feather } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import { HeaderIconAction } from "./HeaderAction";
import PressableThemed from "./PressableThemed";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const menuWidth = 236;
const menuButtonSize = 40;
const glassBorderRadius = 32;
const closeDrift = 40;

export interface GlassOverflowMenuItem {
  key: string;
  label: string;
  accessibilityLabel: string;
  icon: React.ReactElement;
  systemImage?: string;
  onPress: () => void;
}

export interface GlassOverflowMenuProps {
  items: GlassOverflowMenuItem[];
  accessibilityLabel?: string;
}

export default function GlassOverflowMenuFallback({
  items,
  accessibilityLabel = "Open quick settings menu",
}: GlassOverflowMenuProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState(items.length * 56);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const borderColor = useNativeVariable("--border") as string;
  const foregroundColor = useNativeVariable("--foreground") as string;
  const popoverColor = useNativeVariable("--popover") as string;
  const surfaceBorderColor =
    colorScheme === "dark" ? "rgba(255, 255, 255, 0.18)" : borderColor;
  const [progress] = useState(() => new Animated.Value(0));
  const useNativeGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();

  useEffect(() => {
    if (!isMounted) return;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [isMounted, progress]);

  const closeMenu = () => {
    setIsMenuOpen(false);

    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  };

  const openMenu = () => {
    setIsMounted(true);
    setIsMenuOpen(true);
  };

  const scaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [menuButtonSize / menuWidth, 1],
  });
  const scaleY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [menuButtonSize / Math.max(menuHeight, menuButtonSize), 1],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [(menuWidth - menuButtonSize) / 2 + closeDrift, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      -(Math.max(menuHeight, menuButtonSize) - menuButtonSize) / 2 - closeDrift,
      0,
    ],
  });
  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0, 0.15, 1],
  });

  const handleMenuLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);

    if (nextHeight && nextHeight !== menuHeight) {
      setMenuHeight(nextHeight);
    }
  };

  return (
    <>
      <HeaderIconAction
        onPress={openMenu}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Shows quick actions for settings and management screens"
      >
        <Feather name="more-horizontal" size={26} color={foregroundColor} />
      </HeaderIconAction>
      <Modal
        visible={isMounted}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View className="flex-1">
          <AnimatedPressable
            onPress={closeMenu}
            style={[StyleSheet.absoluteFillObject, { opacity: progress }]}
            accessibilityRole="button"
            accessibilityLabel="Close quick settings menu"
          />
          <Animated.View
            pointerEvents="box-none"
            style={[
              !useNativeGlass
                ? {
                    opacity: progress,
                  }
                : null,
              {
                position: "absolute",
                top: insets.top - 2,
                right: 14,
                width: menuWidth,
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  { scaleX },
                  { scaleY },
                  { translateX },
                  { translateY },
                ],
              }}
            >
              <View
                onLayout={handleMenuLayout}
                style={{
                  borderWidth: 1,
                  overflow: "hidden",
                  borderColor: useNativeGlass
                    ? "transparent"
                    : surfaceBorderColor,
                  backgroundColor: popoverColor,
                  borderRadius: glassBorderRadius,
                }}
              >
                {useNativeGlass ? (
                  <GlassView
                    glassEffectStyle={{
                      style: isMenuOpen ? "regular" : "none",
                      animate: true,
                      animationDuration: 0.16,
                    }}
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      borderRadius: glassBorderRadius,
                    }}
                  />
                ) : (
                  <BlurView
                    intensity={65}
                    tint="default"
                    experimentalBlurMethod={
                      Platform.OS === "android" ? "dimezisBlurView" : undefined
                    }
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      borderRadius: glassBorderRadius,
                    }}
                  />
                )}
                <Animated.View style={{ opacity: contentOpacity }}>
                  {items.map((item, index) => (
                    <PressableThemed
                      key={item.key}
                      onPress={() => {
                        item.onPress();
                        setIsMounted(false);
                      }}
                      className={twMerge(
                        "px-5 py-2",
                        index === 0 ? "pt-4" : null,
                        index === items.length - 1 ? "pb-4" : null,
                      )}
                      accessibilityLabel={item.accessibilityLabel}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="h-[34px] w-[34px] items-center justify-center rounded-full">
                          <Text className="text-foreground">{item.icon}</Text>
                        </View>
                        <Text
                          maxFontSizeMultiplier={2.5}
                          className="text-foreground flex-1 text-xl"
                        >
                          {item.label}
                        </Text>
                      </View>
                    </PressableThemed>
                  ))}
                </Animated.View>
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
