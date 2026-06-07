"use strict";

import { useContext, useMemo } from "react";
import { VariableContext, VariableContextProvider } from "react-native-css/native-internal";
import { SafeAreaProvider as OriginalSafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { jsx as _jsx } from "react/jsx-runtime";
export * from "react-native-safe-area-context";
export function SafeAreaProvider({
  children,
  ...props
}) {
  return /*#__PURE__*/_jsx(OriginalSafeAreaProvider, {
    ...props,
    children: /*#__PURE__*/_jsx(SafeAreaEnv, {
      children: children
    })
  });
}
function SafeAreaEnv({
  children
}) {
  const insets = useSafeAreaInsets();
  const parentVars = useContext(VariableContext);
  const value = useMemo(() => ({
    ...parentVars,
    "--react-native-css-safe-area-inset-bottom": insets.bottom,
    "--react-native-css-safe-area-inset-left": insets.left,
    "--react-native-css-safe-area-inset-right": insets.right,
    "--react-native-css-safe-area-inset-top": insets.top
  }), [parentVars, insets]);
  return /*#__PURE__*/_jsx(VariableContextProvider, {
    value: value,
    children: children
  });
}
//# sourceMappingURL=react-native-safe-area-context.native.js.map