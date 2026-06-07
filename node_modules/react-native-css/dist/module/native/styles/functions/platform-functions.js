"use strict";

import { PixelRatio, PlatformColor, StyleSheet } from "react-native";
export const platformColor = (resolveValue, value) => {
  const color = resolveValue(value[2]);
  if (Array.isArray(color)) {
    return PlatformColor(...color);
  } else if (typeof color === "string") {
    return PlatformColor(color);
  }
  return;
};
export const hairlineWidth = () => {
  return StyleSheet.hairlineWidth;
};
export const pixelRatio = () => {
  return PixelRatio.get();
};
export const fontScale = () => {
  return PixelRatio.getFontScale();
};
export const getPixelSizeForLayoutSize = (resolveValue, value) => {
  const size = resolveValue(value[2]);
  if (typeof size === "number") {
    return PixelRatio.getPixelSizeForLayoutSize(size);
  }
  return;
};
export const roundToNearestPixel = (resolveValue, value) => {
  const size = resolveValue(value[2]);
  if (typeof size === "number") {
    return PixelRatio.roundToNearestPixel(size);
  }
  return;
};
//# sourceMappingURL=platform-functions.js.map