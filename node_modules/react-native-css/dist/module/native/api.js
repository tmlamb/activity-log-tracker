"use strict";

/* eslint-disable  */
import { useContext, useState } from "react";
import { Appearance } from "react-native";
import { VariableContext } from "react-native-css/native-internal";
import { mappingToConfig, useNativeCss } from "./react/useNativeCss.js";
import { usePassthrough } from "./react/usePassthrough.js";
import { colorScheme as colorSchemeObs, VAR_SYMBOL } from "./reactivity.js";
import { resolveValue } from "./styles/resolve.js";
export { StyleCollection, VariableContext, VariableContextProvider } from "react-native-css/native-internal";
export { useNativeCss };
const defaultMapping = {
  className: "style"
};

/**
 * Generates a new Higher-Order component the wraps the base component and applies the styles.
 * This is added to the `interopComponents` map so that it can be used in the `wrapJSX` function
 * @param baseComponent
 * @param mapping
 */
export const styled = (baseComponent, mapping = defaultMapping, options) => {
  let component;
  // const type = getComponentType(baseComponent);

  const configs = mappingToConfig(mapping);
  if (options?.passThrough) {
    component = props => {
      return usePassthrough(baseComponent, props, configs);
    };
  } else {
    component = props => {
      return useNativeCss(baseComponent, props, configs);
    };
  }
  const name = baseComponent.displayName ?? baseComponent.name ?? "unknown";
  component.displayName = `CssInterop.${name}`;
  return component;
};
export const colorScheme = {
  get() {
    return colorSchemeObs.get() ?? Appearance.getColorScheme() ?? "light";
  },
  set(value) {
    return colorSchemeObs.set(value);
  }
};
export const useUnstableNativeVariable = useNativeVariable;
export const useCssElement = (component, incomingProps, mapping) => {
  const [config] = useState(() => mappingToConfig(mapping));
  return useNativeCss(component, incomingProps, config);
};
export function useNativeVariable(name) {
  if (name.startsWith("--")) {
    name = name.slice(2);
  }
  const inheritedVariables = useContext(VariableContext);
  const [effect, setState] = useState(() => {
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
  return resolveValue([{}, "var", [name]], effect.get, {
    inheritedVariables
  });
}

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export function vars(variables) {
  return Object.assign({
    [VAR_SYMBOL]: "inline"
  }, Object.fromEntries(Object.entries(variables).map(([k, v]) => [k.replace(/^--/, ""), v])));
}
//# sourceMappingURL=api.js.map