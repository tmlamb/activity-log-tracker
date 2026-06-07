"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shorthandHandler = shorthandHandler;
var _utilities = require("react-native-css/utilities");
var _objects = require("../../objects.js");
var _constants = require("../constants.js");
var _defaults = require("../defaults.js");
/* eslint-disable */

function shorthandHandler(mappings, defaults, returnType = "shorthandObject") {
  return (resolve, value, __, {
    castToArray
  }) => {
    let args = (0, _utilities.isStyleDescriptorArray)(value) ? resolve(value) : Array.isArray(value) ? resolve(value[2]) : value;
    if (!Array.isArray(args)) {
      return;
    }
    args = args.flat();
    if (!Array.isArray(args)) {
      return;
    }
    const match = mappings.find(mapping => {
      return args.length === mapping.length && mapping.every((map, index) => {
        const type = map[1];
        const value = args[index];
        if (Array.isArray(type)) {
          return type.includes(value) || type.includes(typeof value);
        }

        // Style functions (var, calc, env, etc.) are unresolved at pattern-match
        // time — their actual values won't be known until runtime variable
        // resolution. Accepting them in any type slot makes pattern matching
        // less strict when variables are involved, but rejecting them would
        // break variable-based shadows entirely (e.g. box-shadow: var(--shadow)
        // where --shadow resolves to "0 4px 6px -1px #000").
        if ((0, _utilities.isStyleFunction)(value)) {
          return true;
        }
        switch (type) {
          case "string":
          case "number":
            return typeof value === type;
          case "color":
            return typeof value === "string" || typeof value === "object";
          case "length":
            return typeof value === "string" ? value.endsWith("%") : typeof value === "number";
        }
        return;
      });
    });
    if (!match) return;
    const seenDefaults = new Set(defaults);
    const tuples = [...match.map((map, index) => {
      if (map.length === 3) {
        seenDefaults.delete(map);
      }
      let value = args[index];
      if (castToArray && value && !Array.isArray(value)) {
        value = [value];
      }
      return [value, map[0]];
    }), ...Array.from(seenDefaults).map(map => {
      let value = _defaults.defaultValues[map[2]] ?? map[2];
      if (castToArray && value && !Array.isArray(value)) {
        value = [value];
      }
      return [value, map[0]];
    })];
    if (returnType === "shorthandObject" || returnType === "object") {
      const target = returnType === "shorthandObject" ? {
        [_constants.ShortHandSymbol]: true
      } : {};
      for (const [value, prop] of tuples) {
        if (typeof prop === "string") {
          target[prop] = value;
        } else {
          (0, _objects.setDeepPath)(target, prop, value);
        }
      }
      return target;
    } else {
      return tuples;
    }
  };
}
//# sourceMappingURL=_handler.js.map