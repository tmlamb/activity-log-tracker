"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transform = void 0;
/**
 * Handle the unparsable transform property by converting its values into StyleDeclarations
 * Each value should be a StyleDescriptor function of the transform type
 */
const transform = (resolveValue, transformDescriptor) => {
  const transforms = resolveValue(transformDescriptor[2]);
  if (Array.isArray(transforms)) {
    return transforms.filter(transform => transform !== undefined && transform !== "initial");
  } else if (transforms) {
    // If it's a single transform, wrap it in an array
    return [transforms];
  } else {
    return;
  }
};
exports.transform = transform;
//# sourceMappingURL=transform.js.map