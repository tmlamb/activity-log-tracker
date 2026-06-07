import type { ReactNode } from "react";
import { FlatList as RNFlatList, type FlatListProps } from "react-native";
import { type StyledConfiguration, type StyledProps } from "react-native-css";
export declare const FlatList: typeof RNFlatList & (<ItemT>(props: StyledProps<FlatListProps<ItemT>, StyledConfiguration<typeof RNFlatList>>) => ReactNode);
export default FlatList;
//# sourceMappingURL=FlatList.d.ts.map