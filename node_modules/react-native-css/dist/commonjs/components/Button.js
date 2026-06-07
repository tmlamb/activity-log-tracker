"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Button = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: {
    target: false,
    nativeStyleMapping: {
      color: "color"
    }
  }
};
const Button = exports.Button = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.Button, props => {
  return (0, _reactNativeCss.useCssElement)(_reactNative.Button, props, mapping);
});
var _default = exports.default = Button;
//# sourceMappingURL=Button.js.map