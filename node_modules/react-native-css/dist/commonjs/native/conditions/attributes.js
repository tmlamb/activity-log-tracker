"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testAttributes = testAttributes;
function testAttributes(queries, props, guards) {
  return queries.every(query => testAttribute(query, props, guards));
}
function testAttribute([type, prop, operator, testValue], props, guards) {
  let value = undefined;
  if (props) {
    if (type === "a") {
      value = props[prop];
    } else {
      const dataSet = props.dataSet;
      value = dataSet?.[prop];
    }
  }
  guards.push([type, prop, value]);
  if (!operator) {
    return value !== undefined && value !== null && value !== false;
  }
  switch (operator) {
    case "!":
      return !value;
    case "=":
      return value == testValue;
    case "~=":
      return testValue && value?.toString().split(" ").includes(testValue);
    case "|=":
      return testValue && value?.toString().startsWith(testValue + "-");
    case "^=":
      return testValue && value?.toString().startsWith(testValue);
    case "$=":
      return testValue && value?.toString().endsWith(testValue);
    case "*=":
      return testValue && value?.toString().includes(testValue);
    default:
      operator;
      return false;
  }
}
//# sourceMappingURL=attributes.js.map