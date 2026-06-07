"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TextInput = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      textAlign: true
    }
  }
};
const TextInput = exports.TextInput = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.TextInput, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.TextInput, props, mapping);
});
var _default = exports.default = TextInput;
//# sourceMappingURL=TextInput.js.map