"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.border = void 0;
var _handler = require("./_handler.js");
const width = ["borderWidth", "number"];
const style = ["borderStyle", "string"];
const color = ["borderColor", "color", "color"];
const border = exports.border = (0, _handler.shorthandHandler)([[width, style, color], [style, color], [width, style], [style]], []);
//# sourceMappingURL=border.js.map