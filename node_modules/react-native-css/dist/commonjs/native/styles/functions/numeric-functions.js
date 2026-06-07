"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.min = exports.max = exports.clamp = void 0;
const max = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  if (!Array.isArray(args) || args.some(arg => typeof arg !== "number")) {
    return;
  }
  return Math.max(...args);
};
exports.max = max;
const min = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  if (!Array.isArray(args) || args.some(arg => typeof arg !== "number")) {
    return;
  }
  return Math.min(...args);
};
exports.min = min;
const clamp = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  const [clampValue, min, max] = args;
  if (!Array.isArray(args) || typeof clampValue !== "number" || typeof min !== "number" || typeof max !== "number") {
    return;
  }
  return Math.min(Math.max(clampValue, min), max);
};
exports.clamp = clamp;
//# sourceMappingURL=numeric-functions.js.map