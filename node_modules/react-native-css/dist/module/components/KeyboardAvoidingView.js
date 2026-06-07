"use strict";

import { KeyboardAvoidingView as RNKeyboardAvoidingView } from "react-native";
import { useCssElement } from "react-native-css";
import { copyComponentProperties } from "./copyComponentProperties.js";
const mapping = {
  className: {
    target: "style"
  }
};
export const KeyboardAvoidingView = copyComponentProperties(RNKeyboardAvoidingView, props => {
  return useCssElement(RNKeyboardAvoidingView, props, mapping);
});
export default KeyboardAvoidingView;
//# sourceMappingURL=KeyboardAvoidingView.js.map