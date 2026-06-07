"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _specificity = require("./specificity.js");
Object.keys(_specificity).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _specificity[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _specificity[key];
    }
  });
});
var _styleDescriptor = require("./style-descriptor.js");
Object.keys(_styleDescriptor).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _styleDescriptor[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _styleDescriptor[key];
    }
  });
});
var _dotNotationTypes = require("./dot-notation.types.js");
Object.keys(_dotNotationTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _dotNotationTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _dotNotationTypes[key];
    }
  });
});
//# sourceMappingURL=index.js.map