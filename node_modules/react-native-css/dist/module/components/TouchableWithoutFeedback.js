"use strict";

import { TouchableWithoutFeedback as RNTouchableWithoutFeedback } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const TouchableWithoutFeedback = copyComponentProperties(RNTouchableWithoutFeedback, props => {
  return useCssElement(RNTouchableWithoutFeedback, props, mapping);
});
export default TouchableWithoutFeedback;
//# sourceMappingURL=TouchableWithoutFeedback.js.map