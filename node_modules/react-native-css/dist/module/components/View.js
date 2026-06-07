"use strict";

import { View as RNView } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const View = copyComponentProperties(RNView, props => {
  return useCssElement(RNView, props, mapping);
});
export default View;
//# sourceMappingURL=View.js.map