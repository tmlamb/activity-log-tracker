"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _root = require("./root.js");
Object.keys(_root).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _root[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _root[key];
    }
  });
});
var _styleCollection = require("./style-collection.js");
Object.keys(_styleCollection).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _styleCollection[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _styleCollection[key];
    }
  });
});
var _variables = require("./variables.js");
Object.keys(_variables).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _variables[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _variables[key];
    }
  });
});
//# sourceMappingURL=index.js.map