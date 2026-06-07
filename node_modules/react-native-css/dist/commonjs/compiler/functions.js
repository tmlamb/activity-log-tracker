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
  return "hairlineWidth()";
}
function platformSelect(specifics) {
  let output = [];
  for (const [key, value] of Object.entries(specifics)) {
    output.push(`${key}/${value}`);
  }
  return `platformSelect(${output.join(",")})`;
}
function pixelScaleSelect(specifics) {
  let output = [];
  for (const [key, value] of Object.entries(specifics)) {
    output.push(`${key}/${value}`);
  }
  return `pixelScaleSelect(${output.join(",")})`;
}
function fontScaleSelect(specifics) {
  let output = [];
  for (const [key, value] of Object.entries(specifics)) {
    output.push(`${key}/${value}`);
  }
  return `fontScaleSelect(${output.join(",")})`;
}
function pixelScale(value) {
  return value === undefined ? `pixelScale()` : `pixelScale(${value})`;
}
function fontScale(value) {
  return value === undefined ? `fontScale()` : `fontScale(${value})`;
}
function getPixelSizeForLayoutSize(value) {
  return `getPixelSizeForLayoutSize(${value})`;
}
function roundToNearestPixel(value) {
  return `roundToNearestPixel(${value})`;
}
function platformColor(...colors) {
  return `platformColor(${colors.map(color => {
    // Android uses these characters which we must escape when outputting to CSS
    return color.replaceAll("?", "\\?").replaceAll("/", "\\/").replaceAll(":", "\\:");
  }).join(",")})`;
}
//# sourceMappingURL=functions.js.map