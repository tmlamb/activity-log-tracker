"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compileWithAutoDebug = compileWithAutoDebug;
exports.registerCSS = registerCSS;
exports.testID = void 0;
var _reactNative = require("react-native");
var _nodeUtil = require("node:util");
var _compiler = require("react-native-css/compiler");
var _native = require("react-native-css/native");
var _reactivity = require("../native/reactivity.js");
const testID = exports.testID = "react-native-css";
beforeEach(() => {
  _native.StyleCollection.styles.clear();
  _reactivity.dimensions.set(_reactNative.Dimensions.get("window"));
  _reactNative.Appearance.setColorScheme(null);
  _reactivity.colorScheme.set(null);
});
const debugDefault = Boolean(process.env.REACT_NATIVE_CSS_TEST_DEBUG && typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS.includes("--inspect"));
function registerCSS(css, options = {}) {
  const {
    debug = debugDefault
  } = options;
  const compiled = compileWithAutoDebug(css, options);
  if (debug) {
    console.log(`Compiled:\n---\n${(0, _nodeUtil.inspect)({
      stylesheet: compiled.stylesheet(),
      warnings: compiled.warnings()
    }, {
      depth: null,
      colors: true,
      compact: false
    })}`);
  }
  _native.StyleCollection.inject(compiled.stylesheet());
  return compiled;
}
function compileWithAutoDebug(css, {
  debug = debugDefault,
  ...options
} = {}) {
  const logger = debug ? text => {
    // Just log the rules
    if (text.startsWith("[") && debug === "verbose") {
      console.log(`Rules:\n---\n${text}`);
    }
  } : undefined;
  return (0, _compiler.compile)(css, {
    ...options,
    logger
  });
}
//# sourceMappingURL=index.js.map