"use strict";

/* eslint-disable */

import { activeFamily, containerLayoutFamily, focusFamily, hoverFamily } from "../reactivity.js";
const mainCache = new WeakMap();
const defaultHandlers = {
  onLayout: () => {},
  onHoverIn: () => {},
  onHoverOut: () => {},
  onPress: () => {},
  onPressIn: () => {},
  onPressOut: () => {},
  onFocus: () => {},
  onBlur: () => {}
};
export function getInteractionHandler(weakKey, type, handler = defaultHandlers[type]) {
  let cache = mainCache.get(weakKey);
  if (!cache) {
    cache = new WeakMap();
    mainCache.set(weakKey, cache);
  }
  let cached = cache.get(handler);
  if (!cached) {
    cached = event => {
      if (handler) {
        handler(event);
      }
      switch (type) {
        case "onLayout":
          containerLayoutFamily(weakKey).set(event.nativeEvent.layout);
          break;
        case "onHoverIn":
          hoverFamily(weakKey).set(true);
          break;
        case "onHoverOut":
          hoverFamily(weakKey).set(false);
          break;
        case "onPress":
          break;
        case "onPressIn":
          activeFamily(weakKey).set(true);
          break;
        case "onPressOut":
          activeFamily(weakKey).set(false);
          break;
        case "onFocus":
          focusFamily(weakKey).set(true);
          break;
        case "onBlur":
          focusFamily(weakKey).set(false);
          break;
      }
    };
    cache.set(handler, cached);
  }
  return cached;
}
//# sourceMappingURL=interaction.js.map