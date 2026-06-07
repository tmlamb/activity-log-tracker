"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Image = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style"
};
const Image = exports.Image = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.Image, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.Image, props, mapping);
});
var _default = exports.default = Image;
//# sourceMappingURL=Image.js.map