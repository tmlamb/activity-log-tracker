"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.activeFamily = exports.VAR_SYMBOL = exports.ContainerContext = void 0;
exports.cleanupEffect = cleanupEffect;
exports.dimensions = exports.containerWidthFamily = exports.containerLayoutFamily = exports.containerHeightFamily = exports.colorScheme = void 0;
exports.family = family;
exports.hoverFamily = exports.focusFamily = void 0;
exports.observable = observable;
exports.vw = exports.vh = exports.observableBatch = void 0;
exports.weakFamily = weakFamily;
var _react = require("react");
var _reactNative = require("react-native");
/* eslint-disable */

const observableBatch = exports.observableBatch = {};
function observable(init, equality = Object.is) {
  let value;
  let isStatic = typeof init !== "function";
  let didInit;
  let lastArg;
  if (typeof init !== "function") {
    value = init;
    didInit = true;
  }
  const observers = new Set();
  const effect = {
    observers,
    run: () => {
      if (!isStatic) {
        const nextValue = init(getter, lastArg);
        if (equality(value, nextValue)) {
          return;
        }
        value = nextValue;
      }
      notify();
    }
  };
  const getter = observable => observable.get(effect);
  function get(effect) {
    if (effect) {
      observers.add(effect);
    }
    if (!didInit) {
      value = init(getter, undefined);
    }
    return value;
  }
  function set(arg) {
    if (isStatic) {
      if (equality(value, arg)) {
        return;
      }
      value = arg;
    } else {
      const nextValue = init(getter, arg);
      didInit = true;
      lastArg = arg;
      if (equality(value, nextValue)) {
        return;
      }
      value = nextValue;
    }
    notify();
    return obs;
  }
  function notify() {
    Array.from(observers).forEach(observer => {
      if (observableBatch.current) {
        observableBatch.current.add(observer);
      } else {
        observer.run();
      }
    });
  }
  const obs = {
    observers,
    get,
    set,
    run: effect.run
  };
  return obs;
}
function cleanupEffect(effect) {
  if (!effect) return;
  for (const dep of effect.observers) {
    dep.observers.delete(effect);
  }
  effect.observers.clear();
}

/** Family Helpers ************************************************************/

function family(fn) {
  const map = new Map();
  return Object.assign((key, args) => {
    let value = map.get(key);
    if (!value) {
      value = fn(key, args);
      map.set(key, value);
    }
    return value;
  }, {
    delete(key) {
      return map.delete(key);
    },
    clear() {
      return map.clear();
    }
  });
}
function weakFamily(fn) {
  const map = new WeakMap();
  return Object.assign((key, args) => {
    let value = map.get(key);
    if (!value) {
      value = fn(key, args);
      map.set(key, value);
    }
    return value;
  }, {
    has: key => map.has(key)
  });
}

/********************************* Variables **********************************/

const VAR_SYMBOL = exports.VAR_SYMBOL = Symbol.for("react-native-css.var");
/** Pseudo Classes ************************************************************/

const hoverFamily = exports.hoverFamily = weakFamily(() => observable(false));
const activeFamily = exports.activeFamily = weakFamily(() => observable(false));
const focusFamily = exports.focusFamily = weakFamily(() => observable(false));

/** Dimensions ****************************************************************/

const dimensions = exports.dimensions = observable(_reactNative.Dimensions.get("window"));
const vw = exports.vw = observable((read, value) => value ?? read(dimensions)?.width);
const vh = exports.vh = observable((read, value) => value ?? read(dimensions)?.height);
_reactNative.Dimensions.addEventListener("change", ({
  window
}) => {
  observableBatch.current = new Set();
  vw.set(window.width);
  vh.set(window.height);
  for (const effect of observableBatch.current) {
    effect.run();
  }
  observableBatch.current = undefined;
});

/** Color Scheme **************************************************************/

const colorScheme = exports.colorScheme = observable(_reactNative.Appearance.getColorScheme());
_reactNative.Appearance.addChangeListener(event => colorScheme.set(event.colorScheme));

/** Containers ****************************************************************/

const ContainerContext = exports.ContainerContext = /*#__PURE__*/(0, _react.createContext)({});
const containerLayoutFamily = exports.containerLayoutFamily = weakFamily(() => {
  return observable({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
});
const containerWidthFamily = exports.containerWidthFamily = weakFamily(key => {
  return observable(read => {
    return read(containerLayoutFamily(key))?.width || 0;
  });
});
const containerHeightFamily = exports.containerHeightFamily = weakFamily(key => {
  return observable(read => {
    return read(containerLayoutFamily(key))?.width || 0;
  });
});
//# sourceMappingURL=reactivity.js.map