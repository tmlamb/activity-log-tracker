"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.join = void 0;
const join = (resolveValue, value) => {
  const args = resolveValue(value[2]);
  if (!Array.isArray(args)) {
    return args;
  }
  const array = args[0];
  const separator = args[1] ?? ",";
  if (!Array.isArray(array)) {
    return array;
  }
  if (!separator || typeof separator !== "string") {
    return array.join();
  }
  return array.join(separator);
};
exports.join = join;
//# sourceMappingURL=string-functions.js.map