"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VariableContextProvider = VariableContextProvider;
exports.useUnstableNativeVariable = exports.useNativeVariable = exports.useCssElement = exports.styled = exports.colorScheme = void 0;
exports.vars = vars;
var _react = require("react");
var _reactNative = require("react-native");
var _assignStyle = require("./assign-style.js");
var _jsxRuntime = require("react/jsx-runtime");
const defaultMapping = {
  className: "style"
};
const styled = (baseComponent, mapping = defaultMapping, _options) => {
  return props => {
    return useCssElement(baseComponent, props, mapping);
  };
};
exports.styled = styled;
const useCssElement = (component, incomingProps, mapping) => {
  let props = {
    ...incomingProps
  };
  for (const [key, value] of Object.entries(mapping)) {
    const source = props[key];
    if (!source) {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete props[key];
    let target = typeof value === "object" ? value.target : value;
    if (typeof target === "boolean") {
      target = key;
    }
    props = (0, _assignStyle.assignStyle)({
      $$css: true,
      [key]: source
    }, target.split("."), props);
  }
  return /*#__PURE__*/(0, _react.createElement)(component, props);
};
exports.useCssElement = useCssElement;
const colorScheme = exports.colorScheme = {
  get() {
    return _reactNative.Appearance.getColorScheme();
  },
  set(name) {
    _reactNative.Appearance.setColorScheme(name);
  }
};

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
function vars(variables) {
  const $variables = {};
  for (const [key, value] of Object.entries(variables)) {
    if (key.startsWith("--")) {
      $variables[key] = value.toString();
    } else {
      $variables[`--${key}`] = value.toString();
    }
  }
  return $variables;
}
function VariableContextProvider(props) {
  const style = (0, _react.useMemo)(() => {
    return {
      display: "contents",
      ...Object.fromEntries(Object.entries(props.value).map(([key, value]) => [key.startsWith("--") ? key : `--${key}`, value]))
    };
  }, [props.value]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: style,
    children: props.children
  });
}
const useNativeVariable = () => {
  throw new Error("useNativeVariable is not supported in web");
};
exports.useNativeVariable = useNativeVariable;
const useUnstableNativeVariable = () => {
  throw new Error("useUnstableNativeVariable is not supported in web");
};
exports.useUnstableNativeVariable = useUnstableNativeVariable;
//# sourceMappingURL=api.js.map