"use strict";

import { Pressable as RNPressable } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const Pressable = copyComponentProperties(RNPressable, props => {
  return useCssElement(RNPressable, props, mapping);
});
export default Pressable;
//# sourceMappingURL=Pressable.js.map