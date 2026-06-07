"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "StyleCollection", {
  enumerable: true,
  get: function () {
    return _nativeInternal.StyleCollection;
  }
});
Object.defineProperty(exports, "VariableContext", {
  enumerable: true,
  get: function () {
    return _nativeInternal.VariableContext;
  }
});
Object.defineProperty(exports, "VariableContextProvider", {
  enumerable: true,
  get: function () {
    return _nativeInternal.VariableContextProvider;
  }
});
exports.useCssElement = exports.styled = exports.colorScheme = void 0;
Object.defineProperty(exports, "useNativeCss", {
  enumerable: true,
  get: function () {
    return _useNativeCss.useNativeCss;
  }
});
exports.useNativeVariable = useNativeVariable;
exports.useUnstableNativeVariable = void 0;
exports.vars = vars;
var _react = require("react");
var _reactNative = require("react-native");
var _nativeInternal = require("react-native-css/native-internal");
var _useNativeCss = require("./react/useNativeCss.js");
var _usePassthrough = require("./react/usePassthrough.js");
var _reactivity = require("./reactivity.js");
var _resolve = require("./styles/resolve.js");
/* eslint-disable  */

const defaultMapping = {
  className: "style"
};

/**
 * Generates a new Higher-Order component the wraps the base component and applies the styles.
 * This is added to the `interopComponents` map so that it can be used in the `wrapJSX` function
 * @param baseComponent
 * @param mapping
 */
const styled = (baseComponent, mapping = defaultMapping, options) => {
  let component;
  // const type = getComponentType(baseComponent);

  const configs = (0, _useNativeCss.mappingToConfig)(mapping);
  if (options?.passThrough) {
    component = props => {
      return (0, _usePassthrough.usePassthrough)(baseComponent, props, configs);
    };
  } else {
    component = props => {
      return (0, _useNativeCss.useNativeCss)(baseComponent, props, configs);
    };
  }
  const name = baseComponent.displayName ?? baseComponent.name ?? "unknown";
  component.displayName = `CssInterop.${name}`;
  return component;
};
exports.styled = styled;
const colorScheme = exports.colorScheme = {
  get() {
    return _reactivity.colorScheme.get() ?? _reactNative.Appearance.getColorScheme() ?? "light";
  },
  set(value) {
    return _reactivity.colorScheme.set(value);
  }
};
const useUnstableNativeVariable = exports.useUnstableNativeVariable = useNativeVariable;
const useCssElement = (component, incomingProps, mapping) => {
  const [config] = (0, _react.useState)(() => (0, _useNativeCss.mappingToConfig)(mapping));
  return (0, _useNativeCss.useNativeCss)(component, incomingProps, config);
};
exports.useCssElement = useCssElement;
function useNativeVariable(name) {
  if (name.startsWith("--")) {
    name = name.slice(2);
  }
  const inheritedVariables = (0, _react.useContext)(_nativeInternal.VariableContext);
  const [effect, setState] = (0, _react.useState)(() => {
    const effect = {
      observers: new Set(),
      run: () => setState(state => ({
        ...state
      }))
    };
    const get = observable => observable.get(effect);
    return {
      ...effect,
      get
    };
  });
  return (0, _resolve.resolveValue)([{}, "var", [name]], effect.get, {
    inheritedVariables
  });
}

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
function vars(variables) {
  return Object.assign({
    [_reactivity.VAR_SYMBOL]: "inline"
  }, Object.fromEntries(Object.entries(variables).map(([k, v]) => [k.replace(/^--/, ""), v])));
}
//# sourceMappingURL=api.js.map