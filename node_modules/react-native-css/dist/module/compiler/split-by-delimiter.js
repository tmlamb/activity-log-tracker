"use strict";

export function splitByDelimiter(arr, callback) {
  const result = [];
  let current = [];
  for (const item of arr) {
    if (callback(item)) {
      if (current.length > 0) result.push(current);
      current = [];
    } else {
      current.push(item);
    }
  }
  if (current.length > 0) result.push(current);
  return result;
}
//# sourceMappingURL=split-by-delimiter.js.map