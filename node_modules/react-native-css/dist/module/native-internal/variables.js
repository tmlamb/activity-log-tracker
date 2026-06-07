"use strict";

import { createContext, useContext, useMemo } from "react";
import { VAR_SYMBOL } from "../native/reactivity.js";
import { jsx as _jsx } from "react/jsx-runtime";
globalThis.__react_native_css_variable_context ??= /*#__PURE__*/createContext({
  [VAR_SYMBOL]: true
});
export const VariableContext = globalThis.__react_native_css_variable_context;
export function VariableContextProvider(props) {
  const inheritedVariables = useContext(VariableContext);
  const value = useMemo(() => ({
    ...inheritedVariables,
    ...Object.fromEntries(Object.entries(props.value).map(([k, v]) => [k.replace(/^--/, ""), v])),
    [VAR_SYMBOL]: true
  }), [inheritedVariables, props.value]);
  return /*#__PURE__*/_jsx(VariableContext, {
    value: value,
    children: props.children
  });
}
//# sourceMappingURL=variables.js.map