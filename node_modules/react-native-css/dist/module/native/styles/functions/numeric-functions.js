"use strict";

export const max = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  if (!Array.isArray(args) || args.some(arg => typeof arg !== "number")) {
    return;
  }
  return Math.max(...args);
};
export const min = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  if (!Array.isArray(args) || args.some(arg => typeof arg !== "number")) {
    return;
  }
  return Math.min(...args);
};
export const clamp = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  const [clampValue, min, max] = args;
  if (!Array.isArray(args) || typeof clampValue !== "number" || typeof min !== "number" || typeof max !== "number") {
    return;
  }
  return Math.min(Math.max(clampValue, min), max);
};
//# sourceMappingURL=numeric-functions.js.map