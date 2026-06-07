"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.animatedComponentFamily = void 0;
var _reactivity = require("./reactivity.js");
const animatedComponentFamily = exports.animatedComponentFamily = (0, _reactivity.weakFamily)(component => {
  if ("displayName" in component && component.displayName?.startsWith("Animated.")) {
    return component;
  }
  const createAnimatedComponent =
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  require("react-native-reanimated").createAnimatedComponent;
  return createAnimatedComponent(component);
});
//# sourceMappingURL=reanimated.js.map