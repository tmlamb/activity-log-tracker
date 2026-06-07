"use strict";

import { Image as RNImage } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: "style"
};
export const Image = copyComponentProperties(RNImage, props => {
  return useCssElement(RNImage, props, mapping);
});
export default Image;
//# sourceMappingURL=Image.js.map