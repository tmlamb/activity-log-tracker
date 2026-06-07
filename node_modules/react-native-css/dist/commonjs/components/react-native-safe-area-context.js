"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _reactNativeSafeAreaContext = require("react-native-safe-area-context");
Object.keys(_reactNativeSafeAreaContext).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _reactNativeSafeAreaContext[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _reactNativeSafeAreaContext[key];
    }
  });
});
//# sourceMappingURL=react-native-safe-area-context.js.map