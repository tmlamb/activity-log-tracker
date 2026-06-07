"use strict";

import tailwind from "@tailwindcss/postcss";
import { screen, render as tlRender } from "@testing-library/react-native";
import postcss from "postcss";
import { View } from "react-native-css/components";
import { registerCSS } from "react-native-css/jest";
import { jsx as _jsx } from "react/jsx-runtime";
const testID = "tailwind";
const debugDefault = Boolean(process.env.NODE_OPTIONS?.includes("--inspect"));
export async function render(component, {
  css,
  sourceInline = Array.from(getClassNames(component)),
  debug = debugDefault,
  theme = true,
  preflight = false,
  plugin = true,
  extraCss,
  ...options
} = {}) {
  if (!css) {
    css = ``;
    if (theme) {
      css += `@import "tailwindcss/theme.css" layer(theme);\n`;
    }
    if (preflight) {
      css += `@import "tailwindcss/preflight.css" layer(base);\n`;
    }
    css += `@import "tailwindcss/utilities.css" layer(utilities) source(none);`;
    if (plugin) {
      css += `\n@import "./theme.css";`;
    }
    css += sourceInline.map(source => `\n@source inline("${source}");`).join("\n");
    if (extraCss) {
      css += `\n${extraCss}`;
    }
  }
  if (debug) {
    console.log(`Input CSS:\n---\n${css}\n---\n`);
  }

  // Process the TailwindCSS
  const {
    css: output
  } = await postcss([/* Tailwind seems to internally cache things, so we need a random value to cache bust */
  tailwind({
    base: Date.now().toString()
  })]).process(css, {
    from: __dirname
  });
  if (debug) {
    console.log(`Output CSS:\n---\n${output}\n---\n`);
  }
  const compiled = registerCSS(output, {
    debug: Boolean(debug)
  });
  return Object.assign({}, tlRender(component, {
    ...options
  }), compiled);
}
render.debug = (component, options = {}) => {
  return render(component, {
    ...options,
    debug: true
  });
};
function getClassNames(component, classNames = new Set()) {
  if (typeof component.props === "object" && "className" in component.props && typeof component.props.className === "string") {
    classNames.add(component.props.className);
  }
  if (component.props.children) {
    const children = Array.isArray(component.props.children) ? component.props.children : [component.props.children];
    for (const child of children) {
      getClassNames(child, classNames);
    }
  }
  return classNames;
}
export async function renderSimple({
  className,
  ...options
}) {
  const {
    warnings: warningFn
  } = await render(/*#__PURE__*/_jsx(View, {
    testID: testID,
    className: className
  }), {
    sourceInline: className ? [className] : [],
    ...options
  });
  const component = screen.getByTestId(testID, {
    hidden: true
  });

  // Strip the testID and the children
  const {
    testID: _testID,
    children,
    ...props
  } = component.props;
  const compilerWarnings = warningFn();
  let warnings;
  if (compilerWarnings.properties) {
    warnings ??= {};
    warnings.properties = compilerWarnings.properties;
  }
  const warningValues = compilerWarnings.values;
  if (warningValues) {
    warnings ??= {};
    warnings.values = Object.fromEntries(Object.entries(warningValues).map(([key, value]) => [key, value.length > 1 ? value : value[0]]));
  }
  return warnings ? {
    props,
    warnings
  } : {
    props
  };
}
renderSimple.debug = options => {
  return renderSimple({
    ...options,
    debug: true
  });
};

/**
 * Helper method that uses the current test name to render the component
 * Doesn't not support multiple components or changing the component type
 */
export async function renderCurrentTest({
  className = expect.getState().currentTestName?.split(/\s+/).at(-1) ?? "",
  ...options
} = {}) {
  return renderSimple({
    ...options,
    className
  });
}
renderCurrentTest.debug = (options = {}) => {
  return renderCurrentTest({
    ...options,
    debug: true
  });
};
//# sourceMappingURL=test-utils.js.map