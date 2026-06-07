"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.vw = exports.vh = exports.rem = exports.em = void 0;
var _reactivity = require("../reactivity.js");
const em = (resolve, func) => {
  const value = func[2];
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
exports.em = em;
const vw = (_, func, get) => {
  const value = func[2];
  if (typeof value !== "number") {
    return;
  }
  return round(get(_reactivity.vw) * (value / 100));
};
exports.vw = vw;
const vh = (_, func, get) => {
  const value = func[2];
  if (typeof value !== "number") {
    return;
  }
  return round(value / 100 * get(_reactivity.vh));
};
exports.vh = vh;
const rem = (resolve, func) => {
  const value = func[2];
  if (typeof value !== "number") {
    return;
  }
  const remValue = resolve([{}, "var", ["__rn-css-rem"]]);
  if (typeof remValue === "number") {
    return round(value * remValue);
  }
  return;
};
exports.rem = rem;
function round(number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
//# sourceMappingURL=units.js.map