"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Text = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const Text = exports.Text = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.Text, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.Text, props, mapping);
});
var _default = exports.default = Text;
//# sourceMappingURL=Text.js.map