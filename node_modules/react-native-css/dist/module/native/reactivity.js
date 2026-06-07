"use strict";

/* eslint-disable */
import { createContext } from "react";
import { Appearance, Dimensions } from "react-native";
export const observableBatch = {};
export function observable(init, equality = Object.is) {
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
export function cleanupEffect(effect) {
  if (!effect) return;
  for (const dep of effect.observers) {
    dep.observers.delete(effect);
  }
  effect.observers.clear();
}

/** Family Helpers ************************************************************/

export function family(fn) {
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
export function weakFamily(fn) {
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

export const VAR_SYMBOL = Symbol.for("react-native-css.var");
/** Pseudo Classes ************************************************************/

export const hoverFamily = weakFamily(() => observable(false));
export const activeFamily = weakFamily(() => observable(false));
export const focusFamily = weakFamily(() => observable(false));

/** Dimensions ****************************************************************/

export const dimensions = observable(Dimensions.get("window"));
export const vw = observable((read, value) => value ?? read(dimensions)?.width);
export const vh = observable((read, value) => value ?? read(dimensions)?.height);
Dimensions.addEventListener("change", ({
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

export const colorScheme = observable(Appearance.getColorScheme());
Appearance.addChangeListener(event => colorScheme.set(event.colorScheme));

/** Containers ****************************************************************/

export const ContainerContext = /*#__PURE__*/createContext({});
export const containerLayoutFamily = weakFamily(() => {
  return observable({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
});
export const containerWidthFamily = weakFamily(key => {
  return observable(read => {
    return read(containerLayoutFamily(key))?.width || 0;
  });
});
export const containerHeightFamily = weakFamily(key => {
  return observable(read => {
    return read(containerLayoutFamily(key))?.width || 0;
  });
});
//# sourceMappingURL=reactivity.js.map