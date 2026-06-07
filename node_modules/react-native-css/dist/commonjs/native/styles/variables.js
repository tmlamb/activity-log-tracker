"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.varResolver = varResolver;
var _nativeInternal = require("react-native-css/native-internal");
var _utilities = require("react-native-css/utilities");
var _reactivity = require("../reactivity.js");
function varResolver(resolve, fn, get, options) {
  const {
    renderGuards,
    inheritedVariables: variables = {
      [_reactivity.VAR_SYMBOL]: true
    },
    inlineVariables,
    variableHistory = new Set()
  } = options;
  const args = fn[2];
  let name;
  let fallback;
  if (typeof args === "string") {
    name = args;
  } else {
    const result = resolve(args);
    if ((0, _utilities.isStyleDescriptorArray)(result)) {
      name = result[0];
      fallback = result[1];
    }
  }
  if (typeof name !== "string") {
    return;
  }

  // If this recurses back to the same variable, we need to stop
  if (variableHistory.has(name)) {
    return;
  }
  if (name in variables) {
    renderGuards?.push(["v", name, variables[name]]);
    return resolve(variables[name]);
  }
  variableHistory.add(name);
  let value = resolve(inlineVariables?.[name]);
  if (value !== undefined) {
    options.inlineVariables ??= {
      [_reactivity.VAR_SYMBOL]: "inline"
    };
    options.inlineVariables[name] = value;
    return value;
  }
  value = resolve(variables[name]);
  if (value !== undefined) {
    renderGuards?.push(["v", name, value]);
    options.inlineVariables ??= {
      [_reactivity.VAR_SYMBOL]: "inline"
    };
    options.inlineVariables[name] = value;
    return value;
  }
  value = resolve(get((0, _nativeInternal.universalVariables)(name)));
  if (value !== undefined) {
    options.inlineVariables ??= {
      [_reactivity.VAR_SYMBOL]: "inline"
    };
    options.inlineVariables[name] = value;
    return value;
  }
  value = resolve(get((0, _nativeInternal.rootVariables)(name)));
  if (value !== undefined) {
    options.inlineVariables ??= {
      [_reactivity.VAR_SYMBOL]: "inline"
    };
    options.inlineVariables[name] = value;
    return value;
  }
  return resolve(fallback);
}
//# sourceMappingURL=variables.js.map