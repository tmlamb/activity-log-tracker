"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getInteractionHandler = getInteractionHandler;
var _reactivity = require("../reactivity.js");
/* eslint-disable */

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
function getInteractionHandler(weakKey, type, handler = defaultHandlers[type]) {
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
          (0, _reactivity.containerLayoutFamily)(weakKey).set(event.nativeEvent.layout);
          break;
        case "onHoverIn":
          (0, _reactivity.hoverFamily)(weakKey).set(true);
          break;
        case "onHoverOut":
          (0, _reactivity.hoverFamily)(weakKey).set(false);
          break;
        case "onPress":
          break;
        case "onPressIn":
          (0, _reactivity.activeFamily)(weakKey).set(true);
          break;
        case "onPressOut":
          (0, _reactivity.activeFamily)(weakKey).set(false);
          break;
        case "onFocus":
          (0, _reactivity.focusFamily)(weakKey).set(true);
          break;
        case "onBlur":
          (0, _reactivity.focusFamily)(weakKey).set(false);
          break;
      }
    };
    cache.set(handler, cached);
  }
  return cached;
}
//# sourceMappingURL=interaction.js.map