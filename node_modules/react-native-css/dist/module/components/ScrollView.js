"use strict";

import { ScrollView as RNScrollView } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style",
  contentContainerClassName: "contentContainerStyle"
};
export const ScrollView = copyComponentProperties(RNScrollView, props => {
  return useCssElement(RNScrollView, props, mapping);
});
export default ScrollView;
//# sourceMappingURL=ScrollView.js.map