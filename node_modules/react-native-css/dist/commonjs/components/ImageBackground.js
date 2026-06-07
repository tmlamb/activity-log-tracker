"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ImageBackground = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: {
    target: "style",
    nativeStyleMapping: {
      backgroundColor: true
    }
  }
};
const ImageBackground = exports.ImageBackground = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.ImageBackground, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.ImageBackground, props, mapping);
});
var _default = exports.default = ImageBackground;
//# sourceMappingURL=ImageBackground.js.map