"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mappingToConfig = mappingToConfig;
exports.useNativeCss = useNativeCss;
var _react = require("react");
var _reactNative = require("react-native");
var _nativeInternal = require("react-native-css/native-internal");
var _guards = require("../conditions/guards.js");
var _reactivity = require("../reactivity.js");
var _reanimated = require("../reanimated.js");
var _index = require("../styles/index.js");
var _rules = require("./rules.js");
/* eslint-disable */

/**
 * useNativeCss is the native implementation of the useCssElement hook.
 */
function useNativeCss(type, originalProps, configs = [{
  source: "className",
  target: "style"
}]) {
  const inheritedVariables = (0, _react.useContext)(_nativeInternal.VariableContext);
  const inheritedContainers = (0, _react.useContext)(_reactivity.ContainerContext);
  const [state, setState] = (0, _react.useState)(() => {
    // Both effects share the same observers to improve memory usage
    const observers = new Set();

    /**
     * When fired, this effect will force the rules to be re-evaluated.
     * This will cause a re-render if there are different rules
     *
     * Use this when a rule condition changes, e.g FastRefresh or media queries
     */
    const ruleEffect = {
      observers,
      run: () => setState(state => (0, _rules.updateRules)(state))
    };

    /**
     * When fired, this effect will force a re-render of the component.
     * This will cause a re-fetch of the styles.
     *
     * Use this when a value changes, e.g vm units or light / dark mode
     */
    const styleEffect = {
      observers,
      run: () => setState(state => ({
        ...state
      }))
    };
    return (0, _rules.updateRules)({
      ruleEffect,
      ruleEffectGetter: observable => observable.get(ruleEffect),
      styleEffect,
      configs,
      inheritedContainers,
      inheritedVariables,
      pressable: type === _reactNative.View ? false : undefined
    }, originalProps, inheritedVariables, inheritedContainers, false, false);
  });

  // Both effects share the same observers, so we only need to cleanup one of them
  (0, _react.useEffect)(() => () => (0, _reactivity.cleanupEffect)(state.ruleEffect), [state.ruleEffect]);

  // Check if our derived state has changed (e.g the className prop)
  if ((0, _guards.testGuards)(state, originalProps, inheritedVariables, inheritedContainers)) {
    /**
     * Get the new state
     * Note, this might result in the same styles, but the guards will now be different
     */
    setState((0, _rules.updateRules)(state, originalProps, inheritedVariables, inheritedContainers, true));

    // We can bail on rendering as the result of this render will be discarded
    return /*#__PURE__*/(0, _react.createElement)(_react.Fragment);
  }
  let props = (0, _index.getStyledProps)(state, originalProps);
  if (type === _reactNative.View && props?.onPress) {
    type = _reactNative.Pressable;
  }
  if (state.animated) {
    type = (0, _reanimated.animatedComponentFamily)(type);
  }
  if (state.variables) {
    props = {
      value: state.variables,
      children: /*#__PURE__*/(0, _react.createElement)(type, props)
    };
    type = _nativeInternal.VariableContext.Provider;
  }
  if (state.containers) {
    props = {
      value: state.containers,
      children: /*#__PURE__*/(0, _react.createElement)(type, props)
    };
    type = _reactivity.ContainerContext.Provider;
  }
  return /*#__PURE__*/(0, _react.createElement)(type, props);
}

/**
 * Convert the styled() mapping to a config array
 */
function mappingToConfig(mapping) {
  return Object.entries(mapping).flatMap(([key, value]) => {
    if (value === true) {
      return {
        source: key,
        target: key
      };
    } else if (value === false) {
      return {
        source: key,
        target: false
      };
    } else if (typeof value === "string") {
      return {
        source: key,
        target: value.split(".")
      };
    } else if (typeof value === "object") {
      const nativeStyleMapping = value.nativeStyleMapping;
      if (Array.isArray(value)) {
        return {
          source: key,
          target: value,
          nativeStyleMapping
        };
      }
      if ("target" in value) {
        if (value.target === false) {
          return {
            source: key,
            target: false,
            nativeStyleMapping
          };
        } else if (typeof value.target === "string") {
          const target = value.target.split(".");
          if (target.length === 1) {
            return {
              source: key,
              target: target[0],
              nativeStyleMapping
            };
          } else {
            return {
              source: key,
              target,
              nativeStyleMapping
            };
          }
        } else if (Array.isArray(value.target)) {
          return {
            source: key,
            target: value.target,
            nativeStyleMapping
          };
        }
      }
    }
    throw new Error(`styled(): Invalid mapping for ${key}: ${value}`);
  });
}
//# sourceMappingURL=useNativeCss.js.map