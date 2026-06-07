"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.View = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const View = exports.View = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.View, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.View, props, mapping);
});
var _default = exports.default = View;
//# sourceMappingURL=View.js.map