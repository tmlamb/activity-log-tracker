"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TouchableOpacity = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const TouchableOpacity = exports.TouchableOpacity = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.TouchableOpacity, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.TouchableOpacity, props, mapping);
});
var _default = exports.default = TouchableOpacity;
//# sourceMappingURL=TouchableOpacity.js.map