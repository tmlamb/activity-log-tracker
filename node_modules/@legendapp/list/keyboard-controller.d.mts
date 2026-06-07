import * as React from 'react';
import { LegendList as LegendList$1, LegendListProps, LegendListRef } from '@legendapp/list';
import { AnimatedLegendList } from '@legendapp/list/animated';
import { AnimatedLegendList as AnimatedLegendList$1 } from '@legendapp/list/reanimated';

declare const LegendList: <ItemT, ListT extends typeof LegendList$1 | typeof AnimatedLegendList | typeof AnimatedLegendList$1 = (<T>(props: LegendListProps<T> & React.RefAttributes<LegendListRef>) => React.ReactNode) & {
    displayName?: string;
}>(props: (LegendListProps<ItemT> & {
    LegendList?: ListT;
}) & React.RefAttributes<LegendListRef>) => React.ReactNode;

export { LegendList };
