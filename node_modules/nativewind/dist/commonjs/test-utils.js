"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.render = render;
exports.renderCurrentTest = renderCurrentTest;
exports.renderSimple = renderSimple;
var _postcss = _interopRequireDefault(require("@tailwindcss/postcss"));
var _reactNative = require("@testing-library/react-native");
var _postcss2 = _interopRequireDefault(require("postcss"));
var _components = require("react-native-css/components");
var _jest = require("react-native-css/jest");
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const testID = "tailwind";
const debugDefault = Boolean(process.env.NODE_OPTIONS?.includes("--inspect"));
async function render(component, {
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
  } = await (0, _postcss2.default)([/* Tailwind seems to internally cache things, so we need a random value to cache bust */
  (0, _postcss.default)({
    base: Date.now().toString()
  })]).process(css, {
    from: __dirname
  });
  if (debug) {
    console.log(`Output CSS:\n---\n${output}\n---\n`);
  }
  const compiled = (0, _jest.registerCSS)(output, {
    debug: Boolean(debug)
  });
  return Object.assign({}, (0, _reactNative.render)(component, {
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
async function renderSimple({
  className,
  ...options
}) {
  const {
    warnings: warningFn
  } = await render(/*#__PURE__*/(0, _jsxRuntime.jsx)(_components.View, {
    testID: testID,
    className: className
  }), {
    sourceInline: className ? [className] : [],
    ...options
  });
  const component = _reactNative.screen.getByTestId(testID, {
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
async function renderCurrentTest({
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