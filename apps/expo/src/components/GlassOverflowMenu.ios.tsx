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
import { Host, VStack } from "@expo/ui/swift-ui";
import { frame, glassEffect } from "@expo/ui/swift-ui/modifiers";
import { Feather } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import type { GlassOverflowMenuProps } from "./GlassOverflowMenuFallback";
import GlassOverflowMenuFallback from "./GlassOverflowMenuFallback";
import { HeaderIconAction } from "./HeaderAction";
import PressableThemed from "./PressableThemed";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const menuWidth = 236;
const menuButtonSize = 40;
const glassBorderRadius = 32;
const closeDrift = 60;
const liquidGlassMinimumIosVersion = 26;

export default function GlassOverflowMenu({
  items,
  accessibilityLabel = "Open quick settings menu",
}: GlassOverflowMenuProps) {
  if (!isNativeGlassPopoverAvailable()) {
    return (
      <GlassOverflowMenuFallback
        items={items}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <NativeGlassOverflowMenu
      items={items}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export type {
  GlassOverflowMenuItem,
  GlassOverflowMenuProps,
} from "./GlassOverflowMenuFallback";

function NativeGlassOverflowMenu({
  items,
  accessibilityLabel = "Open quick settings menu",
}: GlassOverflowMenuProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [menuHeight, setMenuHeight] = useState(items.length * 56);
  const colorScheme = useColorScheme();
  const hostColorScheme = colorScheme === "dark" ? "dark" : "light";
  const insets = useSafeAreaInsets();
  const foregroundColor = useNativeVariable("--foreground") as string;
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!isMounted) return;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isMounted, progress]);

  const closeMenu = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  };

  const openMenu = () => {
    setIsMounted(true);
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
    outputRange: [menuWidth + closeDrift, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-Math.max(menuHeight, menuButtonSize) / 2 - closeDrift, 0],
  });
  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });
  const menuOpacity = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.3, 1],
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
            style={{
              position: "absolute",
              top: insets.top - 2,
              right: 14,
              width: menuWidth,
            }}
          >
            <Animated.View
              style={{
                opacity: menuOpacity,
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
                  overflow: "hidden",
                  borderRadius: glassBorderRadius,
                }}
              >
                <View
                  pointerEvents="none"
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: glassBorderRadius,
                  }}
                >
                  <Host
                    colorScheme={hostColorScheme}
                    style={StyleSheet.absoluteFillObject}
                  >
                    <VStack
                      modifiers={[
                        frame({ width: menuWidth, height: menuHeight }),
                        glassEffect({
                          glass: { variant: "regular" },
                          shape: "roundedRectangle",
                          cornerRadius: glassBorderRadius,
                        }),
                      ]}
                    >
                      {null}
                    </VStack>
                  </Host>
                </View>
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

function isNativeGlassPopoverAvailable() {
  const majorVersion =
    typeof Platform.Version === "string"
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;

  return majorVersion >= liquidGlassMinimumIosVersion;
}
