"use strict";

import { Button as RNButton } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: {
    target: false,
    nativeStyleMapping: {
      color: "color"
    }
  }
};
export const Button = copyComponentProperties(RNButton, props => {
  return useCssElement(RNButton, props, mapping);
});
export default Button;
//# sourceMappingURL=Button.js.map