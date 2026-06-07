"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.universalVariables = exports.rootVariables = void 0;
var _reactNative = require("react-native");
var _mediaQuery = require("../native/conditions/media-query.js");
var _reactivity = require("../native/reactivity.js");
const rootVariableFamily = () => {
  return (0, _reactivity.family)(() => {
    const obs = (0, _reactivity.observable)((read, variableValue) => {
      if (!variableValue) return undefined;
      for (const [value, mediaQuery] of variableValue) {
        if (!mediaQuery) {
          return value;
        }
        if ((0, _mediaQuery.testMediaQuery)(mediaQuery, read)) {
          return value;
        }
      }
      return undefined;
    });
    return obs;
  });
};
const rootVariables = exports.rootVariables = rootVariableFamily();
const universalVariables = exports.universalVariables = rootVariableFamily();
rootVariables("__rn-css-rem").set([[14]]);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
rootVariables("__rn-css-color").set([[_reactNative.Platform.OS === "ios" ? (0, _reactNative.PlatformColor)("label", "labelColor") : (0, _reactNative.PlatformColor)("?attr/textColorPrimary", "SystemBaseHighColor")]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
]);
//# sourceMappingURL=root.js.map