"use strict";

import { withReactNativeCSS } from "react-native-css/metro";
export function withNativewind(config, options) {
  return withReactNativeCSS(config, {
    globalClassNamePolyfill: true,
    typescriptEnvPath: "nativewind-env.d.ts",
    ...options
  });
}

/**
 * @deprecated use `withNativewind` instead
 */
export const withNativeWind = withNativewind;
//# sourceMappingURL=metro.js.map