"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.colorMix = void 0;
var _fn = require("colorjs.io/fn");
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

_fn.ColorSpace.register(_fn.sRGB);
_fn.ColorSpace.register(_fn.P3);
_fn.ColorSpace.register(_fn.OKLab);
const colorMix = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  if (!Array.isArray(args) || args.length < 3) {
    return;
  }
  try {
    const space = args.shift();
    let left = (0, _fn.parse)(args.shift());
    let next = args.shift();
    if (typeof next === "string" && next.endsWith("%")) {
      left.alpha = parseFloat(next) / 100;
      next = args.shift();
    }
    if (next === undefined) {
      if (left.spaceId !== "srgb") {
        left = (0, _fn.to)(left, "srgb");
      }
      return `rgba(${(left.coords[0] ?? 0) * 255}, ${(left.coords[1] ?? 0) * 255}, ${(left.coords[2] ?? 0) * 255}, ${left.alpha})`;
    }
    if (typeof next !== "string") {
      return;
    }
    const right = (0, _fn.parse)(next);
    next = args.shift();
    if (next && typeof next === "string" && next.endsWith("%")) {
      right.alpha = parseFloat(next) / 100;
    }
    const result = (0, _fn.mix)(left, right, {
      space,
      outputSpace: "srgb"
    });
    return `rgba(${(result.coords[0] ?? 0) * 255}, ${(result.coords[1] ?? 0) * 255}, ${(result.coords[2] ?? 0) * 255}, ${result.alpha})`;
  } catch {
    return;
  }
};
exports.colorMix = colorMix;
//# sourceMappingURL=color-mix.js.map