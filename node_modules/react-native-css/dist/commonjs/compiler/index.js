"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _compiler = require("./compiler.js");
Object.keys(_compiler).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _compiler[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _compiler[key];
    }
  });
});
//# sourceMappingURL=index.js.map