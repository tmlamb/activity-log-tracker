"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lineHeight = void 0;
const lineHeight = (resolve, func) => {
  const value = resolve(func[2]);
  if (typeof value !== "number") {
    return;
  }
  let emValue = resolve([{}, "var", ["__rn-css-em"]]);
  if (typeof emValue !== "number") {
    emValue = resolve([{}, "var", ["__rn-css-rem"]]);
  }
  if (typeof emValue !== "number") {
    return;
  }
  return round(value * emValue);
};
exports.lineHeight = lineHeight;
function round(number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
//# sourceMappingURL=line-height.js.map