"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.usePassthrough = usePassthrough;
var _react = require("react");
var _rules = require("./rules.js");
/* eslint-disable */

const cache = new Map();
function usePassthrough(type, {
  ...props
}, configs) {
  for (const config of configs) {
    let {
      source,
      target
    } = config;
    const classNames = props[source];
    let styles = cache.get(source);
    if (styles === undefined) {
      styles = {
        [_rules.INLINE_RULE_SYMBOL]: classNames
      };
    }
    delete props[source];
    if (classNames === undefined || target === false) {
      continue;
    }
    let targetProps = props;
    if (Array.isArray(target)) {
      for (let i = 0; i < target.length - 1; i++) {
        const prop = target[i];
        props[prop] ??= {};
        targetProps = props[prop];
      }
      target = target[target.length - 1];
    }
    if (Array.isArray(targetProps[target])) {
      targetProps[target] = [...targetProps[target], styles];
    } else if (targetProps[target]) {
      targetProps[target] = [targetProps[target], styles];
    } else {
      targetProps[target] = styles;
    }
  }
  return /*#__PURE__*/(0, _react.createElement)(type, props);
}
//# sourceMappingURL=usePassthrough.js.map