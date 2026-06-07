"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TouchableWithoutFeedback = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const TouchableWithoutFeedback = exports.TouchableWithoutFeedback = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.TouchableWithoutFeedback, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.TouchableWithoutFeedback, props, mapping);
});
var _default = exports.default = TouchableWithoutFeedback;
//# sourceMappingURL=TouchableWithoutFeedback.js.map