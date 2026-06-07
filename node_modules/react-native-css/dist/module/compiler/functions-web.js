"use strict";

/* eslint-disable */

export function hairlineWidth() {
  return 1;
}
export function platformSelect(specifics) {
  return specifics["web"] ?? specifics["default"];
}
export function pixelScaleSelect(specifics) {
  return specifics[1] ?? specifics["default"];
}
export function fontScaleSelect(specifics) {
  return specifics[1] ?? specifics["default"];
}
export function pixelScale(value = 1) {
  return value;
}
export function fontScale(value = 1) {
  return value;
}
export function getPixelSizeForLayoutSize(value) {
  return value;
}
export function roundToNearestPixel(value) {
  return value;
}
export function platformColor(...colors) {
  return colors;
}
//# sourceMappingURL=functions-web.js.map