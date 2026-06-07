"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fontScale = fontScale;
exports.fontScaleSelect = fontScaleSelect;
exports.getPixelSizeForLayoutSize = getPixelSizeForLayoutSize;
exports.hairlineWidth = hairlineWidth;
exports.pixelScale = pixelScale;
exports.pixelScaleSelect = pixelScaleSelect;
exports.platformColor = platformColor;
exports.platformSelect = platformSelect;
exports.roundToNearestPixel = roundToNearestPixel;
/* eslint-disable */

function hairlineWidth() {
  return 1;
}
function platformSelect(specifics) {
  return specifics["web"] ?? specifics["default"];
}
function pixelScaleSelect(specifics) {
  return specifics[1] ?? specifics["default"];
}
function fontScaleSelect(specifics) {
  return specifics[1] ?? specifics["default"];
}
function pixelScale(value = 1) {
  return value;
}
function fontScale(value = 1) {
  return value;
}
function getPixelSizeForLayoutSize(value) {
  return value;
}
function roundToNearestPixel(value) {
  return value;
}
function platformColor(...colors) {
  return colors;
}
//# sourceMappingURL=functions-web.js.map