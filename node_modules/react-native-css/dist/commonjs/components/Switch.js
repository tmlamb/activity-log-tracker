"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Switch = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const Switch = exports.Switch = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.Switch, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.Switch, props, mapping);
});
var _default = exports.default = Switch;
//# sourceMappingURL=Switch.js.map