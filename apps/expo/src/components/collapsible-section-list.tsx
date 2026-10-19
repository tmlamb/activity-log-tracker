import type { LegendListRef } from "@legendapp/list/react-native";
import type { ComponentType, ReactElement, ReactNode } from "react";
import type { ScrollViewProps, StyleProp, ViewStyle } from "react-native";
import { isValidElement, useCallback, useMemo, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { CollapsibleEndSpace } from "~/utils/collapsible-list-end-space";
import { useCollapsibleListLayout } from "~/hooks/use-collapsible-list-layout";
import { CollapsibleListItemContext } from "./collapsible-list-context";
import {
  collapseAnimationDuration,
  collapseAnimationEasing,
} from "./collapsible-section-animation";
import { AnimatedLegendListStyled } from "./Styled";

type ListComponent = ComponentType | ReactElement | null;

interface CollapsibleSectionListProps<ItemT>
  extends Omit<ScrollViewProps, "children" | "maintainVisibleContentPosition"> {
  className?: string;
  contentContainerClassName?: string;
  data: readonly ItemT[];
  keyExtractor: (item: ItemT, index: number) => string;
  renderItem: (info: { item: ItemT; index: number }) => ReactNode;
  extraData?: unknown;
  ListHeaderComponent?: ListComponent;
  ListHeaderComponentStyle?: StyleProp<ViewStyle>;
  ListFooterComponent?: ListComponent;
  ListFooterComponentStyle?: StyleProp<ViewStyle>;
}

type ListRow<ItemT> =
  | { type: "item"; key: string; item: ItemT; index: number }
  | { type: "footer"; key: string };

function ListFooter({ component }: { component: ListComponent }) {
  if (isValidElement(component)) return component;
  if (!component) return null;
  const Component = component;
  return <Component />;
}

function EndReserve({
  reserve,
  onFinish,
}: {
  reserve: CollapsibleEndSpace;
  onFinish: (id: number) => void;
}) {
  const { id, height, phase } = reserve;
  const style = useAnimatedStyle(
    () => ({
      height:
        phase === "releasing"
          ? withTiming(
              0,
              {
                duration: collapseAnimationDuration,
                easing: collapseAnimationEasing,
              },
              (finished) => {
                if (finished) scheduleOnRN(onFinish, id);
              },
            )
          : height,
    }),
    [height, id, onFinish, phase],
  );

  return <Animated.View pointerEvents="none" style={style} />;
}

/**
 * Use with one CollapsibleSection per data row. The row context automatically
 * coordinates measurement, retention and animations; pages only own their data
 * and collapsed state. Footers participate in the same position transition.
 */
export function CollapsibleSectionList<ItemT>({
  data,
  keyExtractor,
  renderItem,
  extraData,
  ListFooterComponent,
  ListFooterComponentStyle,
  ...scrollProps
}: CollapsibleSectionListProps<ItemT>) {
  const listRef = useRef<LegendListRef>(null);
  const hasFooter = ListFooterComponent != null;
  const rows = useMemo(() => {
    const items: ListRow<ItemT>[] = data.map((item, index) => ({
      type: "item",
      key: `item:${keyExtractor(item, index)}`,
      item,
      index,
    }));
    if (hasFooter) items.push({ type: "footer", key: "footer" });
    return items;
  }, [data, hasFooter, keyExtractor]);
  const itemKeys = useMemo(() => rows.map((row) => row.key), [rows]);
  const {
    alwaysRender,
    endReserve,
    finishEndReserve,
    onMetricsChange,
    itemLayoutAnimation,
    prepareLayoutChange,
    finishLayoutChange,
    cancelItemLayout,
  } = useCollapsibleListLayout(listRef, itemKeys);
  const layout = useMemo(
    () => ({ prepareLayoutChange, finishLayoutChange, cancelItemLayout }),
    [prepareLayoutChange, finishLayoutChange, cancelItemLayout],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: ListRow<ItemT> }) =>
      row.type === "footer" ? (
        <View style={ListFooterComponentStyle}>
          <ListFooter component={ListFooterComponent ?? null} />
        </View>
      ) : (
        <CollapsibleListItemContext value={{ itemKey: row.key, layout }}>
          {renderItem({ item: row.item, index: row.index })}
        </CollapsibleListItemContext>
      ),
    [layout, ListFooterComponent, ListFooterComponentStyle, renderItem],
  );

  return (
    <CollapsibleListItemContext value={null}>
      <AnimatedLegendListStyled
        {...scrollProps}
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.type}
        renderItem={renderRow}
        extraData={extraData}
        alwaysRender={alwaysRender}
        itemLayoutAnimation={itemLayoutAnimation}
        // Real native flow, outside LegendList's fixed-height virtual item layer.
        // Animation frames update the scroll range without resizing list rows.
        ListFooterComponent={
          <EndReserve reserve={endReserve} onFinish={finishEndReserve} />
        }
        onMetricsChange={onMetricsChange}
        recycleItems={false}
        // EndReserve prevents a collapsing row from clamping the scroll range.
        // Letting LegendList also retain the visible position can instead move
        // the entire page down after a shrink, leaving a gap at the top.
        maintainVisibleContentPosition={{ data: false, size: false }}
      />
    </CollapsibleListItemContext>
  );
}
