"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.VirtualizedList = void 0;
var _reactNative = require("react-native");
var _reactNativeCss = require("react-native-css");
var _copyComponentProperties = require("./copyComponentProperties.js");
const mapping = {
  className: "style",
  ListFooterComponentClassName: "ListFooterComponentStyle",
  ListHeaderComponentClassName: "ListHeaderComponentStyle",
  contentContainerClassName: "contentContainerStyle"
};
const VirtualizedList = exports.VirtualizedList = (0, _copyComponentProperties.copyComponentProperties)(_reactNative.VirtualizedList, function (props) {
  return (0, _reactNativeCss.useCssElement)(_reactNative.VirtualizedList, props, mapping);
});
var _default = exports.default = VirtualizedList;
//# sourceMappingURL=VirtualizedList.js.map