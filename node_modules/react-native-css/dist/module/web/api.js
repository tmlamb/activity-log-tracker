"use strict";

import { createElement, useMemo } from "react";
import { Appearance } from "react-native";
import { assignStyle } from "./assign-style.js";
import { jsx as _jsx } from "react/jsx-runtime";
const defaultMapping = {
  className: "style"
};
export const styled = (baseComponent, mapping = defaultMapping, _options) => {
  return props => {
    return useCssElement(baseComponent, props, mapping);
  };
};
export const useCssElement = (component, incomingProps, mapping) => {
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
    props = assignStyle({
      $$css: true,
      [key]: source
    }, target.split("."), props);
  }
  return /*#__PURE__*/createElement(component, props);
};
export const colorScheme = {
  get() {
    return Appearance.getColorScheme();
  },
  set(name) {
    Appearance.setColorScheme(name);
  }
};

/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export function vars(variables) {
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
export function VariableContextProvider(props) {
  const style = useMemo(() => {
    return {
      display: "contents",
      ...Object.fromEntries(Object.entries(props.value).map(([key, value]) => [key.startsWith("--") ? key : `--${key}`, value]))
    };
  }, [props.value]);
  return /*#__PURE__*/_jsx("div", {
    style: style,
    children: props.children
  });
}
export const useNativeVariable = () => {
  throw new Error("useNativeVariable is not supported in web");
};
export const useUnstableNativeVariable = () => {
  throw new Error("useUnstableNativeVariable is not supported in web");
};
//# sourceMappingURL=api.js.map