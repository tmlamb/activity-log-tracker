"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.KeyboardAvoidingView = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: {
    target: "style"
  }
};
const KeyboardAvoidingView = exports.KeyboardAvoidingView = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.KeyboardAvoidingView, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.KeyboardAvoidingView, props, mapping);
});
var _default = exports.default = KeyboardAvoidingView;
//# sourceMappingURL=KeyboardAvoidingView.js.map