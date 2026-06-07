"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.textShadow = void 0;
var _handler = require("./_handler.js");
const width = [["textShadowOffset", "width"], "number"];
const height = [["textShadowOffset", "height"], "number"];
const blur = ["textShadowRadius", "number", "textShadowRadius"];
const color = ["textShadowColor", "color", "color"];
const textShadow = exports.textShadow = (0, _handler.shorthandHandler)([[width, height, blur, color], [color, width, height, blur], [width, height, color], [color, width, height], [width, height]], [blur, color]);
//# sourceMappingURL=text-shadow.js.map