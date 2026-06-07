"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
require("./metro.js");
var _api = require("./api.js");
Object.keys(_api).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _api[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _api[key];
    }
  });
});
//# sourceMappingURL=index.js.map