"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.roundToNearestPixel = exports.platformColor = exports.pixelRatio = exports.hairlineWidth = exports.getPixelSizeForLayoutSize = exports.fontScale = void 0;
var _reactNative = require("react-native");
const platformColor = (resolveValue, value) => {
  const color = resolveValue(value[2]);
  if (Array.isArray(color)) {
    return (0, _reactNative.PlatformColor)(...color);
  } else if (typeof color === "string") {
    return (0, _reactNative.PlatformColor)(color);
  }
  return;
};
exports.platformColor = platformColor;
const hairlineWidth = () => {
  return _reactNative.StyleSheet.hairlineWidth;
};
exports.hairlineWidth = hairlineWidth;
const pixelRatio = () => {
  return _reactNative.PixelRatio.get();
};
exports.pixelRatio = pixelRatio;
const fontScale = () => {
  return _reactNative.PixelRatio.getFontScale();
};
exports.fontScale = fontScale;
const getPixelSizeForLayoutSize = (resolveValue, value) => {
  const size = resolveValue(value[2]);
  if (typeof size === "number") {
    return _reactNative.PixelRatio.getPixelSizeForLayoutSize(size);
  }
  return;
};
exports.getPixelSizeForLayoutSize = getPixelSizeForLayoutSize;
const roundToNearestPixel = (resolveValue, value) => {
  const size = resolveValue(value[2]);
  if (typeof size === "number") {
    return _reactNative.PixelRatio.roundToNearestPixel(size);
  }
  return;
};
exports.roundToNearestPixel = roundToNearestPixel;
//# sourceMappingURL=platform-functions.js.map