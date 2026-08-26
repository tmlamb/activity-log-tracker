import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutAnimation } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AntDesign } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import PressableThemed from "./PressableThemed";
import { SectionHeading } from "./Typography";

const collapseAnimationDuration = 320;
const collapseAnimationEasing = Easing.bezier(0.22, 0, 0, 1);

export function useCollapsibleSectionScroll() {
  const scrollOffsetRef = useRef(0);
  const listHeightRef = useRef(0);

  const onListLayout = useCallback((event: LayoutChangeEvent) => {
    listHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const prepareSectionToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  return useMemo(
    () => ({
      onListLayout,
      onScroll,
      prepareSectionToggle,
      getScrollOffset: () => scrollOffsetRef.current,
      getListHeight: () => listHeightRef.current,
    }),
    [onListLayout, onScroll, prepareSectionToggle],
  );
}

interface CollapsibleSectionHeaderProps {
  title: string;
  collapsed: boolean;
  onPress: () => void;
  className?: string;
  titleClassName?: string;
  chevronClassName?: string;
  accessibilityLabel?: string;
}

export function CollapsibleSectionHeader({
  title,
  collapsed,
  onPress,
  className,
  titleClassName,
  chevronClassName,
  accessibilityLabel,
}: CollapsibleSectionHeaderProps) {
  const chevronRotation = useSharedValue(collapsed ? 0 : 90);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  useEffect(() => {
    chevronRotation.value = withTiming(collapsed ? 0 : 90, { duration: 180 });
  }, [chevronRotation, collapsed]);

  return (
    <PressableThemed
      className={twMerge(
        "mx-5 flex-row items-center justify-between pt-3 pb-2",
        className,
      )}
      onPress={onPress}
      accessibilityLabel={
        accessibilityLabel ?? `${collapsed ? "Expand" : "Collapse"} ${title}`
      }
      accessibilityState={{ expanded: !collapsed }}
    >
      <SectionHeading
        placement="inline"
        className={twMerge("flex-1 pr-3", titleClassName)}
      >
        {title}
      </SectionHeading>
      <Animated.Text
        maxFontSizeMultiplier={2.5}
        className={twMerge("text-muted", chevronClassName)}
        style={chevronStyle}
      >
        <AntDesign name="right" size={15} />
      </Animated.Text>
    </PressableThemed>
  );
}

interface CollapsibleSectionBodyProps {
  collapsed: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  onContentLayout?: (height: number) => void;
}

export function CollapsibleSectionBody({
  collapsed,
  children,
  className,
  contentClassName,
  onContentLayout,
}: CollapsibleSectionBodyProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const expansionProgress = useSharedValue(collapsed ? 0 : 1);
  const bodyStyle = useAnimatedStyle(() =>
    contentHeight > 0
      ? { height: contentHeight * expansionProgress.value }
      : {},
  );
  const contentStyle = useAnimatedStyle(() =>
    contentHeight > 0
      ? {
          transform: [
            { translateY: -contentHeight * (1 - expansionProgress.value) },
          ],
        }
      : {},
  );

  useEffect(() => {
    expansionProgress.value = withTiming(collapsed ? 0 : 1, {
      duration: collapseAnimationDuration,
      easing: collapseAnimationEasing,
    });
  }, [collapsed, expansionProgress]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && nextHeight !== contentHeight) {
      setContentHeight(nextHeight);
    }
    onContentLayout?.(nextHeight);
  };

  return (
    <Animated.View
      className={twMerge("w-full overflow-hidden", className)}
      style={bodyStyle}
    >
      <Animated.View
        key={collapsed ? "collapsed" : "expanded"}
        className={twMerge("absolute right-0 left-0", contentClassName)}
        onLayout={handleContentLayout}
        style={contentStyle}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
