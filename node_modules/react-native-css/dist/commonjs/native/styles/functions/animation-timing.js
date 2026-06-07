"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.steps = exports.cubicBezier = void 0;
/* eslint-disable @typescript-eslint/no-require-imports */
const advancedTimingFunctions = {
  cubicBezier: () => {
    return require("react-native-reanimated").cubicBezier;
  },
  steps: () => {
    return require("react-native-reanimated").steps;
  }
};
const timingFunctionResolver = (resolveValue, value) => {
  const name = value[1];
  const resolver = advancedTimingFunctions[name];
  if (!resolver) {
    return;
  }
  const args = resolveValue(value[2]);
  if (!Array.isArray(args)) {
    return;
  }
  const fn = resolver();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const result = fn(...args);
  return result;
};
const cubicBezier = exports.cubicBezier = timingFunctionResolver;
const steps = exports.steps = timingFunctionResolver;
//# sourceMappingURL=animation-timing.js.map