"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assignStyle = assignStyle;
/* eslint-disable */
function assignStyle(value, targets, props) {
  const target = targets.shift();
  if (!target) return {};
  if (targets.length === 0) {
    if (typeof props[target] === "function") {
      const cb = props[target];
      props[target] = (...args) => {
        return [cb(...args), value];
      };
    } else {
      props[target] = [props[target], value];
    }
    return props;
  } else {
    props[target] ??= {};
    assignStyle(value, targets, props[target]);
    return props;
  }
}
//# sourceMappingURL=assign-style.js.map