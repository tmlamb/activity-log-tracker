import * as React from 'react';
import { ComponentProps } from 'react';
import Reanimated from 'react-native-reanimated';
import { LegendListPropsBase, LegendListRef } from '@legendapp/list';

type KeysToOmit = "getEstimatedItemSize" | "getFixedItemSize" | "getItemType" | "keyExtractor" | "animatedProps" | "renderItem" | "onItemSizeChanged" | "itemsAreEqual" | "ItemSeparatorComponent";
type PropsBase<ItemT> = LegendListPropsBase<ItemT, ComponentProps<typeof Reanimated.ScrollView>>;
interface AnimatedLegendListPropsBase<ItemT> extends Omit<PropsBase<ItemT>, KeysToOmit> {
    refScrollView?: React.Ref<Reanimated.ScrollView>;
}
type OtherAnimatedLegendListProps<ItemT> = Pick<PropsBase<ItemT>, KeysToOmit>;
type AnimatedLegendListProps<ItemT> = Omit<AnimatedLegendListPropsBase<ItemT>, "refLegendList" | "ref"> & OtherAnimatedLegendListProps<ItemT>;
type AnimatedLegendListDefinition = <ItemT>(props: AnimatedLegendListProps<ItemT> & {
    ref?: React.Ref<LegendListRef>;
}) => React.ReactElement | null;
declare const AnimatedLegendList: AnimatedLegendListDefinition;

export { AnimatedLegendList, type AnimatedLegendListProps, type AnimatedLegendListPropsBase };
