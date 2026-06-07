"use strict";

import { VirtualizedList as RNVirtualizedList } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style",
  ListFooterComponentClassName: "ListFooterComponentStyle",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  contentContainerClassName: "contentContainerStyle"
};
export const VirtualizedList = copyComponentProperties(RNVirtualizedList, function (props) {
  return useCssElement(RNVirtualizedList, props, mapping);
});
export default VirtualizedList;
//# sourceMappingURL=VirtualizedList.js.map