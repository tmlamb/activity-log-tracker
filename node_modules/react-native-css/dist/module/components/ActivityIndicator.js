"use strict";

import { ActivityIndicator as RNActivityIndicator } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      color: "color"
    }
  }
};
export const ActivityIndicator = copyComponentProperties(RNActivityIndicator, props => {
  return useCssElement(RNActivityIndicator, props, mapping);
});
export default ActivityIndicator;
//# sourceMappingURL=ActivityIndicator.js.map