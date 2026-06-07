"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testRule = testRule;
var _reactivity = require("../reactivity.js");
var _attributes = require("./attributes.js");
var _containerQuery = require("./container-query.js");
var _mediaQuery = require("./media-query.js");
function testRule(rule, get, props, guards, containerContext) {
  if (rule.p && !pseudoClasses(rule.p, get)) {
    return false;
  }
  if (rule.m && !(0, _mediaQuery.testMediaQuery)(rule.m, get)) {
    return false;
  }
  if (rule.aq && !(0, _attributes.testAttributes)(rule.aq, props, guards)) {
    return false;
  }
  if (rule.cq && !(0, _containerQuery.testContainerQueries)(rule.cq, containerContext, guards, get)) {
    return false;
  }
  return true;
}
function pseudoClasses(query, get) {
  // IMPORTANT: active needs: to be first. Modifies a global value
  // that we use to determine if the component should be a pressable
  if (query.a && !get((0, _reactivity.activeFamily)(get))) {
    return false;
  }
  if (query.h && !get((0, _reactivity.hoverFamily)(get))) {
    return false;
  }
  if (query.f && !get((0, _reactivity.focusFamily)(get))) {
    return false;
  }
  return true;
}
//# sourceMappingURL=index.js.map