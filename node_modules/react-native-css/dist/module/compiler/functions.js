"use strict";

/* eslint-disable */

export function hairlineWidth() {
  return "hairlineWidth()";
}
export function platformSelect(specifics) {
  let output = [];
  for (const [key, value] of Object.entries(specifics)) {
    output.push(`${key}/${value}`);
  }
  return `platformSelect(${output.join(",")})`;
}
export function pixelScaleSelect(specifics) {
  let output = [];
  for (const [key, value] of Object.entries(specifics)) {
    output.push(`${key}/${value}`);
  }
  return `pixelScaleSelect(${output.join(",")})`;
}
export function fontScaleSelect(specifics) {
  let output = [];
  for (const [key, value] of Object.entries(specifics)) {
    output.push(`${key}/${value}`);
  }
  return `fontScaleSelect(${output.join(",")})`;
}
export function pixelScale(value) {
  return value === undefined ? `pixelScale()` : `pixelScale(${value})`;
}
export function fontScale(value) {
  return value === undefined ? `fontScale()` : `fontScale(${value})`;
}
export function getPixelSizeForLayoutSize(value) {
  return `getPixelSizeForLayoutSize(${value})`;
}
export function roundToNearestPixel(value) {
  return `roundToNearestPixel(${value})`;
}
export function platformColor(...colors) {
  return `platformColor(${colors.map(color => {
    // Android uses these characters which we must escape when outputting to CSS
    return color.replaceAll("?", "\\?").replaceAll("/", "\\/").replaceAll(":", "\\:");
  }).join(",")})`;
}
//# sourceMappingURL=functions.js.map