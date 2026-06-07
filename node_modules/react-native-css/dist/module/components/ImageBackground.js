"use strict";

import { ImageBackground as RNImageBackground } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      backgroundColor: true
    }
  }
};
export const ImageBackground = copyComponentProperties(RNImageBackground, props => {
  return useCssElement(RNImageBackground, props, mapping);
});
export default ImageBackground;
//# sourceMappingURL=ImageBackground.js.map