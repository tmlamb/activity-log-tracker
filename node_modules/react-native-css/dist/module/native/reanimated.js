"use strict";

import { weakFamily } from "./reactivity.js";
export const animatedComponentFamily = weakFamily(component => {
  if ("displayName" in component && component.displayName?.startsWith("Animated.")) {
    return component;
  }
  const createAnimatedComponent =
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  require("react-native-reanimated").createAnimatedComponent;
  return createAnimatedComponent(component);
});
//# sourceMappingURL=reanimated.js.map