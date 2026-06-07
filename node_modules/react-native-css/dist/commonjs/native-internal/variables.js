"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VariableContext = void 0;
exports.VariableContextProvider = VariableContextProvider;
var _react = require("react");
var _reactivity = require("../native/reactivity.js");
var _jsxRuntime = require("react/jsx-runtime");
globalThis.__react_native_css_variable_context ??= /*#__PURE__*/(0, _react.createContext)({
  [_reactivity.VAR_SYMBOL]: true
});
const VariableContext = exports.VariableContext = globalThis.__react_native_css_variable_context;
function VariableContextProvider(props) {
  const inheritedVariables = (0, _react.useContext)(VariableContext);
  const value = (0, _react.useMemo)(() => ({
    ...inheritedVariables,
    ...Object.fromEntries(Object.entries(props.value).map(([k, v]) => [k.replace(/^--/, ""), v])),
    [_reactivity.VAR_SYMBOL]: true
  }), [inheritedVariables, props.value]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(VariableContext, {
    value: value,
    children: props.children
  });
}
//# sourceMappingURL=variables.js.map