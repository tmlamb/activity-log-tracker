"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TouchableHighlight = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const TouchableHighlight = exports.TouchableHighlight = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.TouchableHighlight, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.TouchableHighlight, props, mapping);
});
var _default = exports.default = TouchableHighlight;
//# sourceMappingURL=TouchableHighlight.js.map