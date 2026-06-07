"use strict";

import { activeFamily, focusFamily, hoverFamily } from "../reactivity.js";
import { testAttributes } from "./attributes.js";
import { testContainerQueries } from "./container-query.js";
import { testMediaQuery } from "./media-query.js";
export function testRule(rule, get, props, guards, containerContext) {
  if (rule.p && !pseudoClasses(rule.p, get)) {
    return false;
  }
  if (rule.m && !testMediaQuery(rule.m, get)) {
    return false;
  }
  if (rule.aq && !testAttributes(rule.aq, props, guards)) {
    return false;
  }
  if (rule.cq && !testContainerQueries(rule.cq, containerContext, guards, get)) {
    return false;
  }
  return true;
}
function pseudoClasses(query, get) {
  // IMPORTANT: active needs: to be first. Modifies a global value
  // that we use to determine if the component should be a pressable
  if (query.a && !get(activeFamily(get))) {
    return false;
  }
  if (query.h && !get(hoverFamily(get))) {
    return false;
  }
  if (query.f && !get(focusFamily(get))) {
    return false;
  }
  return true;
}
//# sourceMappingURL=index.js.map