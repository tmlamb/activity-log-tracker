"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyShorthand = applyShorthand;
exports.applyValue = applyValue;
exports.getDeepPath = getDeepPath;
exports.setDeepPath = setDeepPath;
var _constants = require("../native/styles/constants.js");
var _defaults = require("../native/styles/defaults.js");
/* eslint-disable */

function getDeepPath(source, paths) {
  if (!source) {
    return;
  }
  if (paths === false) {
    return undefined;
  }
  if (Array.isArray(paths)) {
    let target = source;
    for (const path of paths) {
      if (typeof target !== "object" || !target || !(path in target)) {
        return undefined;
      }
      target = target[path];
    }
    return target;
  } else if (_defaults.transformKeys.has(paths)) {
    return Array.isArray(source?.transform) ? source.transform.find(t => t[paths] !== undefined) : source.transform;
  } else {
    return source?.[paths];
  }
}
function applyShorthand(value) {
  if (value === undefined) {
    return;
  }
  const target = {
    [_constants.ShortHandSymbol]: true
  };
  const values = value;
  for (const [value, prop] of values) {
    target[prop] = value;
  }
  return target;
}
function applyValue(target, prop, value) {
  // This is confusing.
  // An undefined value means "don't set anything" (something failed while parsing)
  // While a null value means "remove this value", which in React Native means "set to undefined"
  if (value === undefined) {
    return;
  } else if (value === null) {
    value = undefined;
  }
  if (_defaults.transformKeys.has(prop)) {
    if (!Array.isArray(target.transform)) {
      target.transform = [];
    }
    const transformArray = target.transform;

    // Remove any existing values
    target.transform = transformArray.filter(t => !(prop in t));
    if (Array.isArray(value)) {
      target.transform.push(...value);
    } else {
      target.transform.push(value);
    }
    return;
  } else if (typeof value === "object" && value && _constants.ShortHandSymbol in value) {
    delete value[_constants.ShortHandSymbol];
    Object.assign(target, value);
    return;
  }
  target[prop] = value;
}
function setDeepPath(target, paths, value) {
  if (typeof paths === "string") {
    target[paths] = value;
    return target;
  }
  for (let i = 0; i < paths.length - 1; i++) {
    const path = paths[i];
    target[path] ??= {};
    target = target[path];
  }
  target[paths[paths.length - 1]] = value;
  return target;
}
//# sourceMappingURL=objects.js.map