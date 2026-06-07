"use strict";

import { TouchableOpacity as RNTouchableOpacity } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const TouchableOpacity = copyComponentProperties(RNTouchableOpacity, props => {
  return useCssElement(RNTouchableOpacity, props, mapping);
});
export default TouchableOpacity;
//# sourceMappingURL=TouchableOpacity.js.map