"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withNativeWind = void 0;
exports.withNativewind = withNativewind;
var _metro = require("react-native-css/metro");
function withNativewind(config, options) {
  return (0, _metro.withReactNativeCSS)(config, {
    globalClassNamePolyfill: true,
    typescriptEnvPath: "nativewind-env.d.ts",
    ...options
  });
}

/**
 * @deprecated use `withNativewind` instead
 */
const withNativeWind = exports.withNativeWind = withNativewind;
//# sourceMappingURL=metro.js.map