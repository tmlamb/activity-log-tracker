import * as React from 'react';
import { Insets } from 'react-native';
import { ReanimatedScrollEvent } from 'react-native-reanimated/lib/typescript/hook/commonTypes';
import { LegendListRef } from '@legendapp/list';
import { AnimatedLegendListProps } from '@legendapp/list/reanimated';

declare const KeyboardAvoidingLegendList: <ItemT>(props: Omit<AnimatedLegendListProps<ItemT>, "onScroll" | "contentInset"> & {
    onScroll?: (event: ReanimatedScrollEvent) => void;
    contentInset?: Insets | undefined;
    safeAreaInsetBottom?: number;
} & React.RefAttributes<LegendListRef>) => React.ReactNode;

export { KeyboardAvoidingLegendList, KeyboardAvoidingLegendList as LegendList };
