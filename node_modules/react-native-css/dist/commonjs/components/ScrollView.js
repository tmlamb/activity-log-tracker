"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ScrollView = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style",
  contentContainerClassName: "contentContainerStyle"
};
const ScrollView = exports.ScrollView = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.ScrollView, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.ScrollView, props, mapping);
});
var _default = exports.default = ScrollView;
//# sourceMappingURL=ScrollView.js.map