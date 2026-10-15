import type { LayoutChangeEvent } from "react-native";
import type { LayoutAnimationFunction } from "react-native-reanimated";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSyncLayout } from "@legendapp/list/react-native";
import { twMerge } from "tailwind-merge";

import type { CollapsibleListActions } from "./collapsible-list-context";
import type { CollapsibleSectionProps } from "./CollapsibleSection";
import { collapsibleSectionLayoutTransition } from "./collapsible-section-animation";
import { CollapsibleSectionHeader } from "./collapsible-section-header";

const animateBodyLayout = collapsibleSectionLayoutTransition.build();

interface CollapsibleListSectionProps extends CollapsibleSectionProps {
  itemKey: string;
  listLayout: CollapsibleListActions;
}

export function CollapsibleListSection({
  itemKey,
  listLayout,
  title,
  containerClassName,
  headerClassName,
  titleClassName,
  chevronClassName,
  bodyClassName,
  bodyContentClassName,
  accessibilityLabel,
  onContentLayout,
  premeasureCollapsedContent = false,
  collapsed,
  onCollapsedChange,
  children,
}: CollapsibleListSectionProps) {
  const [initiallyCollapsed] = useState(collapsed);
  const [layoutCollapsed, setLayoutCollapsed] = useState(collapsed);
  const [contentHeight, setContentHeight] = useState<number>();
  const [pendingCollapsed, setPendingCollapsed] = useState<boolean>();
  const [transitionId, setTransitionId] = useState(0);
  const itemWidth = useRef(0);
  const measuredContentHeight = useRef<number>(undefined);
  const previousCollapsed = useRef(collapsed);
  const syncLayout = useSyncLayout();
  const { prepareLayoutChange, finishLayoutChange, cancelItemLayout } =
    listLayout;
  const contentIsAbsolute = initiallyCollapsed || contentHeight != null;
  const deferredContentReady = useDeferredValue(
    premeasureCollapsedContent,
    premeasureCollapsedContent && !initiallyCollapsed,
  );

  const bodyTransition = useCallback<LayoutAnimationFunction>(
    (values) => {
      "worklet";
      return {
        ...animateBodyLayout(values),
        // Reversals also finish the interrupted transition's retention lease.
        callback: () => scheduleOnRN(finishLayoutChange, transitionId),
      };
    },
    [finishLayoutChange, transitionId],
  );

  useEffect(() => () => cancelItemLayout(itemKey), [cancelItemLayout, itemKey]);

  const handleSectionLayout = (event: LayoutChangeEvent) => {
    itemWidth.current = event.nativeEvent.layout.width;
  };

  const requestCollapsedChange = useCallback(
    (nextCollapsed: boolean) => {
      const height = measuredContentHeight.current;
      setPendingCollapsed(nextCollapsed);

      const commit = (id: number) => {
        setTransitionId(id);
        setContentHeight(height);
        setLayoutCollapsed(nextCollapsed);
        setPendingCollapsed(undefined);
        syncLayout();
        if (nextCollapsed !== collapsed) onCollapsedChange(nextCollapsed);
      };

      if (height == null) {
        // First open: mount at zero height, measure the natural content, then
        // commit the measured endpoint together with the list's new positions.
        cancelItemLayout(itemKey);
        commit(0);
      } else {
        const previousBodyHeight = layoutCollapsed
          ? 0
          : (contentHeight ?? (initiallyCollapsed ? 0 : height));
        prepareLayoutChange(
          itemKey,
          {
            width: itemWidth.current,
            heightDelta: (nextCollapsed ? 0 : height) - previousBodyHeight,
          },
          commit,
        );
      }
    },
    [
      cancelItemLayout,
      collapsed,
      contentHeight,
      initiallyCollapsed,
      itemKey,
      layoutCollapsed,
      onCollapsedChange,
      prepareLayoutChange,
      syncLayout,
    ],
  );

  useEffect(() => {
    if (previousCollapsed.current === collapsed) return;

    // Completion can collapse an exercise without a header press. Keep the old
    // geometry until that request can commit with the list's new positions too.
    if (collapsed === layoutCollapsed && pendingCollapsed == null) {
      previousCollapsed.current = collapsed;
      return;
    }

    // Let completion's text/status layout settle before preparing its endpoint.
    // Keep the prop unacknowledged until then so a newer render can reschedule
    // or supersede the request without losing it.
    const frame = requestAnimationFrame(() => {
      previousCollapsed.current = collapsed;
      requestCollapsedChange(collapsed);
    });
    return () => cancelAnimationFrame(frame);
  }, [collapsed, layoutCollapsed, pendingCollapsed, requestCollapsedChange]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    onContentLayout?.(height);
    if (height > 0) measuredContentHeight.current = height;
    if (height <= 0 || height === contentHeight) return;
    const nextCollapsed = pendingCollapsed ?? collapsed;

    const commit = (id: number) => {
      setTransitionId(id);
      setContentHeight(height);
      setLayoutCollapsed(nextCollapsed);
      setPendingCollapsed(undefined);
      syncLayout();
      if (nextCollapsed !== collapsed) onCollapsedChange(nextCollapsed);
    };

    if (!initiallyCollapsed && contentHeight == null && !nextCollapsed) {
      // Initially open rows already occupy their natural height on first mount.
      commit(0);
    } else {
      const previousBodyHeight = layoutCollapsed
        ? 0
        : (contentHeight ?? (initiallyCollapsed ? 0 : height));
      prepareLayoutChange(
        itemKey,
        {
          width: itemWidth.current,
          heightDelta: (nextCollapsed ? 0 : height) - previousBodyHeight,
        },
        commit,
      );
    }
  };

  return (
    <View className={containerClassName} onLayout={handleSectionLayout}>
      <CollapsibleSectionHeader
        title={title}
        className={headerClassName}
        titleClassName={titleClassName}
        chevronClassName={chevronClassName}
        accessibilityLabel={accessibilityLabel}
        collapsed={pendingCollapsed ?? collapsed}
        onPress={() => requestCollapsedChange(!(pendingCollapsed ?? collapsed))}
      />
      <Animated.View
        className={twMerge("w-full overflow-hidden", bodyClassName)}
        layout={transitionId === 0 ? undefined : bodyTransition}
        // A static Yoga endpoint lets LegendList measure once. Reanimated's
        // native layout transition animates only the presented geometry.
        style={{
          height: layoutCollapsed
            ? 0
            : (contentHeight ?? (initiallyCollapsed ? 0 : undefined)),
        }}
        pointerEvents={layoutCollapsed ? "none" : "auto"}
        accessibilityElementsHidden={layoutCollapsed}
        importantForAccessibility={
          layoutCollapsed ? "no-hide-descendants" : "auto"
        }
      >
        <Animated.View
          className={twMerge(
            "w-full",
            contentIsAbsolute ? "absolute right-0 bottom-0 left-0" : undefined,
            bodyContentClassName,
          )}
          layout={
            transitionId === 0 ? undefined : collapsibleSectionLayoutTransition
          }
          onLayout={handleContentLayout}
        >
          {contentHeight != null || !layoutCollapsed || deferredContentReady
            ? children
            : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}
