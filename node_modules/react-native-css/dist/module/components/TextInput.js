"use strict";

import { TextInput as RNTextInput } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      textAlign: true
    }
  }
};
export const TextInput = copyComponentProperties(RNTextInput, props => {
  return useCssElement(RNTextInput, props, mapping);
});
export default TextInput;
//# sourceMappingURL=TextInput.js.map