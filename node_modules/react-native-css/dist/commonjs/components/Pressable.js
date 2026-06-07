"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Pressable = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const Pressable = exports.Pressable = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.Pressable, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.Pressable, props, mapping);
});
var _default = exports.default = Pressable;
//# sourceMappingURL=Pressable.js.map