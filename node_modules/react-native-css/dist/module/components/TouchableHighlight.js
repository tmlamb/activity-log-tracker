"use strict";

import { TouchableHighlight as RNTouchableHighlight } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const TouchableHighlight = copyComponentProperties(RNTouchableHighlight, props => {
  return useCssElement(RNTouchableHighlight, props, mapping);
});
export default TouchableHighlight;
//# sourceMappingURL=TouchableHighlight.js.map