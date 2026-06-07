"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  SafeAreaProvider: true
};
exports.SafeAreaProvider = SafeAreaProvider;
var _react = require("react");
var _nativeInternal = require("react-native-css/native-internal");
var _reactNativeSafeAreaContext = require("react-native-safe-area-context");
Object.keys(_reactNativeSafeAreaContext).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _reactNativeSafeAreaContext[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _reactNativeSafeAreaContext[key];
    }
  });
});
var _jsxRuntime = require("react/jsx-runtime");
function SafeAreaProvider({
  children,
  ...props
}) {
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNativeSafeAreaContext.SafeAreaProvider, {
    ...props,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(SafeAreaEnv, {
      children: children
    })
  });
}
function SafeAreaEnv({
  children
}) {
  const insets = (0, _reactNativeSafeAreaContext.useSafeAreaInsets)();
  const parentVars = (0, _react.useContext)(_nativeInternal.VariableContext);
  const value = (0, _react.useMemo)(() => ({
    ...parentVars,
    "--react-native-css-safe-area-inset-bottom": insets.bottom,
    "--react-native-css-safe-area-inset-left": insets.left,
    "--react-native-css-safe-area-inset-right": insets.right,
    "--react-native-css-safe-area-inset-top": insets.top
  }), [parentVars, insets]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_nativeInternal.VariableContextProvider, {
    value: value,
    children: children
  });
}
//# sourceMappingURL=react-native-safe-area-context.native.js.map