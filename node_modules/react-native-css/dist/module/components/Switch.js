"use strict";

import { Switch as RNSwitch } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const Switch = copyComponentProperties(RNSwitch, props => {
  return useCssElement(RNSwitch, props, mapping);
});
export default Switch;
//# sourceMappingURL=Switch.js.map