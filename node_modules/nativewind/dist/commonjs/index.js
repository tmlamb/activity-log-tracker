"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  styled: true,
  useCssElement: true,
  useUnstableNativeVariable: true,
  vars: true,
  VariableContextProvider: true
};
Object.defineProperty(exports, "VariableContextProvider", {
  enumerable: true,
  get: function () {
    return _reactNativeCss.VariableContextProvider;
  }
});
Object.defineProperty(exports, "styled", {
  enumerable: true,
  get: function () {
    return _reactNativeCss.styled;
  }
});
Object.defineProperty(exports, "useCssElement", {
  enumerable: true,
  get: function () {
    return _reactNativeCss.useCssElement;
  }
});
Object.defineProperty(exports, "useUnstableNativeVariable", {
  enumerable: true,
  get: function () {
    return _reactNativeCss.useUnstableNativeVariable;
  }
});
Object.defineProperty(exports, "vars", {
  enumerable: true,
  get: function () {
    return _reactNativeCss.vars;
  }
});
var _stylesheet = require("./stylesheet.js");
Object.keys(_stylesheet).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _stylesheet[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _stylesheet[key];
    }
  });
});
var _reactNativeCss = require("react-native-css");
//# sourceMappingURL=index.js.map