"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveValue = resolveValue;
var _defaults = require("./defaults.js");
var functions = _interopRequireWildcard(require("./functions/index.js"));
var _lineHeight = require("./line-height.js");
var shorthands = _interopRequireWildcard(require("./shorthands/index.js"));
var _units = require("./units.js");
var _variables = require("./variables.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/* eslint-disable */

const functionResolvers = {
  ...shorthands,
  ...functions,
  lineHeight: _lineHeight.lineHeight,
  em: _units.em,
  rem: _units.rem,
  vh: _units.vh,
  vw: _units.vw
};
function resolveValue(value, get, options) {
  const {
    castToArray
  } = options;
  switch (typeof value) {
    case "bigint":
    case "symbol":
    case "undefined":
    case "function":
      // These types are not supported
      return;
    case "number":
    case "boolean":
      return value;
    case "string":
      {
        if (value === "unset") {
          return null;
        } else if (value.endsWith("px")) {
          // Inline vars() might set a value with a px suffix
          return parseInt(value.slice(0, -2), 10);
        } else {
          return value;
        }
      }
    case "object":
      {
        if (!Array.isArray(value)) {
          return value;
        }
        if (isDescriptorArray(value)) {
          value = value.map(d => resolveValue(d, get, options)).filter(d => d !== undefined);
          if (castToArray && !Array.isArray(value)) {
            return [value];
          } else {
            return value;
          }
        }
        const name = value[1];
        const simpleResolve = value => {
          return resolveValue(value, get, options);
        };
        if (name === "var") {
          return (0, _variables.varResolver)(simpleResolve, value, get, options);
        } else if (name in functionResolvers) {
          const fn = functionResolvers[name];
          if (typeof fn !== "function") {
            throw new Error(`Unknown function: ${name}`);
          }
          value = fn(simpleResolve, value, get, options);
        } else if (_defaults.transformKeys.has(name)) {
          // translate, rotate, scale, etc.
          return {
            [name]: simpleResolve(value[2], castToArray)
          };
        } else {
          let args = simpleResolve(value[2], castToArray);
          if (args === undefined) {
            return;
          } else if (Array.isArray(args)) {
            let joinedArgs = args.map(arg => {
              if (Array.isArray(arg)) {
                return arg.flat().join(" ");
              }
              return arg;
            }).filter(value => value !== "/").join(", ");
            if (name === "radial-gradient") {
              // Nativewind / Tailwind CSS hack which can force the 'in oklab' color space
              joinedArgs = joinedArgs.replace("in oklab, ", "");
            }
            value = `${name}(${joinedArgs})`;
          } else {
            value = `${name}(${args})`;
          }
        }
        return castToArray && value && !Array.isArray(value) ? [value] : value;
      }
  }
}
function isDescriptorArray(value) {
  return Array.isArray(value) && typeof value[0] === "object" ? Array.isArray(value[0]) : true;
}
//# sourceMappingURL=resolve.js.map