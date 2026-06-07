"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useColorScheme = useColorScheme;
var _reactNative = require("react-native");
/** @deprecated Use useColorScheme from "react-native" instead */
function useColorScheme() {
  return {
    colorScheme: (0, _reactNative.useColorScheme)(),
    setColorScheme(scheme) {
      _reactNative.Appearance.setColorScheme(scheme);
    },
    toggleColorScheme() {
      _reactNative.Appearance.setColorScheme(_reactNative.Appearance.getColorScheme() === "dark" ? "light" : "dark");
    }
  };
}
//# sourceMappingURL=stylesheet.js.map