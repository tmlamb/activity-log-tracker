"use strict";

import { Text as RNText } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const Text = copyComponentProperties(RNText, props => {
  return useCssElement(RNText, props, mapping);
});
export default Text;
//# sourceMappingURL=Text.js.map