"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ActivityIndicator = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      color: "color"
    }
  }
};
const ActivityIndicator = exports.ActivityIndicator = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.ActivityIndicator, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.ActivityIndicator, props, mapping);
});
var _default = exports.default = ActivityIndicator;
//# sourceMappingURL=ActivityIndicator.js.map