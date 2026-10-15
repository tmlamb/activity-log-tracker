import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import {
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LayoutAnimation, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";

import { CollapsibleListItemContext } from "./collapsible-list-context";
import { CollapsibleListSection } from "./collapsible-list-section";
import {
  collapseAnimationDuration,
  collapseAnimationEasing,
} from "./collapsible-section-animation";
import { CollapsibleSectionHeader } from "./collapsible-section-header";

export { CollapsibleSectionHeader } from "./collapsible-section-header";
export { CollapsibleSectionList } from "./collapsible-section-list";

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

interface CollapsibleSectionBodyProps {
  collapsed: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  onContentLayout?: (height: number) => void;
  premeasureCollapsedContent?: boolean;
}

export function CollapsibleSectionBody({
  collapsed,
  children,
  className,
  contentClassName,
  onContentLayout,
  premeasureCollapsedContent = true,
}: CollapsibleSectionBodyProps) {
  const [initiallyCollapsed] = useState(collapsed);
  const [contentHeight, setContentHeight] = useState(0);
  // Optionally mount hidden content after visible siblings, then retain its layout.
  const deferredContentReady = useDeferredValue(
    premeasureCollapsedContent,
    premeasureCollapsedContent && !initiallyCollapsed,
  );
  const shouldRenderContent =
    contentHeight > 0 || !collapsed || deferredContentReady;
  // After measuring, keep content independent of the body's animated height so
  // wrapped text isn't remeasured against the collapsed height when expanding.
  // A cold open must measure behind a zero-height clip, never briefly enter
  // normal flow at full height before its animation starts.
  const isContentAbsolute = initiallyCollapsed || contentHeight > 0;
  // Reserve space in the same React commit that makes the content absolute,
  // before Reanimated applies its height on the UI thread.
  const initialBodyStyle = isContentAbsolute
    ? { height: initiallyCollapsed ? 0 : contentHeight }
    : undefined;
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
    if (!collapsed && initiallyCollapsed && contentHeight === 0) return;

    expansionProgress.value = withTiming(collapsed ? 0 : 1, {
      duration: collapseAnimationDuration,
      easing: collapseAnimationEasing,
    });
  }, [collapsed, contentHeight, expansionProgress, initiallyCollapsed]);

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
      style={[initialBodyStyle, bodyStyle]}
    >
      <Animated.View
        className={twMerge(
          "w-full",
          isContentAbsolute ? "absolute right-0 left-0" : undefined,
          contentClassName,
        )}
        onLayout={handleContentLayout}
        style={contentStyle}
      >
        {shouldRenderContent ? children : null}
      </Animated.View>
    </Animated.View>
  );
}

export interface CollapsibleSectionProps {
  title: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: React.ReactNode;
  containerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  chevronClassName?: string;
  bodyClassName?: string;
  bodyContentClassName?: string;
  accessibilityLabel?: string;
  onContentLayout?: (height: number) => void;
  premeasureCollapsedContent?: boolean;
}

export function CollapsibleSection(props: CollapsibleSectionProps) {
  const listItem = use(CollapsibleListItemContext);

  return listItem ? (
    <CollapsibleListSection
      {...props}
      itemKey={listItem.itemKey}
      listLayout={listItem.layout}
    />
  ) : (
    <StandaloneCollapsibleSection {...props} />
  );
}

function StandaloneCollapsibleSection({
  title,
  collapsed,
  onCollapsedChange,
  children,
  containerClassName,
  headerClassName,
  titleClassName,
  chevronClassName,
  bodyClassName,
  bodyContentClassName,
  accessibilityLabel,
  onContentLayout,
  premeasureCollapsedContent = false,
}: CollapsibleSectionProps) {
  return (
    <View className={containerClassName}>
      <CollapsibleSectionHeader
        title={title}
        collapsed={collapsed}
        onPress={() => onCollapsedChange(!collapsed)}
        className={headerClassName}
        titleClassName={titleClassName}
        chevronClassName={chevronClassName}
        accessibilityLabel={accessibilityLabel}
      />
      <CollapsibleSectionBody
        collapsed={collapsed}
        className={bodyClassName}
        contentClassName={bodyContentClassName}
        onContentLayout={onContentLayout}
        premeasureCollapsedContent={premeasureCollapsedContent}
      >
        {children}
      </CollapsibleSectionBody>
    </View>
  );
}
