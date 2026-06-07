"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testGuards = testGuards;
/* eslint-disable */

function testGuards(state, currentProps, inheritedVariables, inheritedContainers) {
  return state.guards?.some(guard => {
    let result = false;
    switch (guard[0]) {
      case "a":
        // Attribute
        result = currentProps?.[guard[1]] !== guard[2];
        break;
      case "d":
        // DataSet
        result = currentProps?.dataSet?.[guard[1]] !== guard[2];
        break;
      case "v":
        // Variables
        result = inheritedVariables[guard[1]] !== guard[2];
        break;
      case "c":
        // Containers
        result = inheritedContainers[guard[1]] !== guard[2];
        break;
    }
    return result;
  });
}
//# sourceMappingURL=guards.js.map