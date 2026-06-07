"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StyleCollection = void 0;
Object.defineProperty(exports, "rootVariables", {
  enumerable: true,
  get: function () {
    return _root.rootVariables;
  }
});
Object.defineProperty(exports, "universalVariables", {
  enumerable: true,
  get: function () {
    return _root.universalVariables;
  }
});
var _containerQuery = require("../native/conditions/container-query.js");
var _reactivity = require("../native/reactivity.js");
var _root = require("./root.js");
globalThis.__react_native_css_style_collection ??= {
  styles: (0, _reactivity.family)(() => {
    return (0, _reactivity.observable)([], isDeepEqual);
  }),
  keyframes: (0, _reactivity.family)(() => {
    return (0, _reactivity.observable)([], isDeepEqual);
  }),
  inject: function (options) {
    _reactivity.observableBatch.current = new Set();
    StyleCollection.styles("will-change-variable").set([{
      s: [0],
      v: []
    }]);
    StyleCollection.styles("will-change-container").set([{
      s: [0],
      c: [_containerQuery.DEFAULT_CONTAINER_NAME]
    }]);
    StyleCollection.styles("will-change-animation").set([{
      s: [0],
      a: true
    }]);
    StyleCollection.styles("will-change-pressable").set([{
      s: [0],
      p: {
        h: 1
      }
    }]);
    if (options.s) {
      for (const style of options.s) {
        StyleCollection.styles(style[0]).set(style[1]);
      }
    }
    if (options.k) {
      for (const keyframes of options.k) {
        StyleCollection.keyframes(keyframes[0]).set(keyframes[1]);
      }
    }
    if (options.vr) {
      for (const entry of options.vr) {
        (0, _root.rootVariables)(entry[0]).set(entry[1]);
      }
    }
    if (options.vu) {
      for (const entry of options.vu) {
        (0, _root.rootVariables)(entry[0]).set(entry[1]);
      }
    }
    for (const effect of _reactivity.observableBatch.current) {
      effect.run();
    }
    _reactivity.observableBatch.current = undefined;
  }
};
const StyleCollection = exports.StyleCollection = globalThis.__react_native_css_style_collection;
function isDeepEqual(a, b) {
  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  const requiresKeyComparison = typeof a === "object" && typeof b === "object" && aArray === bArray;

  // Only compare keys when both are an object or array
  // This does not account for complex types like Date/Regex, because we don't use them
  if (!requiresKeyComparison) return a === b;

  // Make either are not null
  if (!a || !b) {
    return a === b;
  }

  // Shortcut for arrays
  if (aArray && bArray && a.length !== b.length) {
    return false;
  }

  // Compare a to b
  for (const key in a) {
    if (!isDeepEqual(a[key], b[key])) {
      return false;
    }
  }

  // Compare b to a
  for (const key in b) {
    if (!(key in a)) {
      return false;
    }
  }
  return true;
}
//# sourceMappingURL=style-collection.js.map