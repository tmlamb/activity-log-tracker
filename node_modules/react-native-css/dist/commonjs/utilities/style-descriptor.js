"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isStyleDescriptorArray = isStyleDescriptorArray;
exports.isStyleFunction = isStyleFunction;
function isStyleDescriptorArray(value) {
  if (Array.isArray(value)) {
    // If its an array and the first item is an object, the only allowed value is an array
    return typeof value[0] === "object" ? Array.isArray(value[0]) : true;
  }
  return false;
}
function isStyleFunction(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "object" ? Object.keys(value[0]).length === 0 : false;
  }
  return false;
}
//# sourceMappingURL=style-descriptor.js.map