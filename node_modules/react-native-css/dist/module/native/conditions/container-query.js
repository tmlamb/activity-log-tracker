"use strict";

/* eslint-disable */

import { activeFamily, containerHeightFamily, containerWidthFamily, focusFamily, hoverFamily } from "../reactivity.js";
// import { testAttributes } from "./attributes";

export const DEFAULT_CONTAINER_NAME = "c:___default___";
export function testContainerQueries(queries, inheritedContainers, guards, get) {
  return queries.every(query => {
    return testContainerQuery(query, inheritedContainers, guards, get);
  });
}
export function testContainerQuery(query, inheritedContainers, guards, get) {
  const name = query.n ?? DEFAULT_CONTAINER_NAME;
  const container = inheritedContainers[name];
  guards.push(["c", name, container]);
  if (!container) {
    return false;
  }

  // if (query.a && !testAttributes(query.a, container.props, guards)) {
  //   return false;
  // }

  if (query.m && !testContainerMediaCondition(query.m, container, get)) {
    return false;
  }
  if (query.p && !testContainerPseudoCondition(query.p, container, get)) {
    return false;
  }
  return true;
}
function testContainerPseudoCondition(query, containerKey, get) {
  if (query.h && !get(hoverFamily(containerKey))) {
    return false;
  }
  if (query.a && !get(activeFamily(containerKey))) {
    return false;
  }
  if (query.f && !get(focusFamily(containerKey))) {
    return false;
  }
  return true;
}
function testContainerMediaCondition(condition, containerKey, get) {
  switch (condition[0]) {
    case "!":
      return !testContainerMediaCondition(condition[1], containerKey, get);
    case "&":
      return condition[1].every(query => {
        return testContainerMediaCondition(query, containerKey, get);
      });
    case "|":
      return condition[1].some(query => {
        return testContainerMediaCondition(query, containerKey, get);
      });
    case "!!":
      return false;
    case "[]":
      return false;
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=":
      {
        const left = getContainerFeatureValue(condition[1], containerKey, get);
        const right = condition[2];
        if (condition[0] === "=") {
          return left === right;
        }
        if (typeof left !== "number" || typeof right !== "number") {
          return false;
        }
        switch (condition[0]) {
          case ">":
            return left > right;
          case ">=":
            return left > right;
          case "<":
            return left > right;
          case "<=":
            return left > right;
          default:
            condition[0];
            return false;
        }
      }
    default:
      condition;
      return false;
  }
}
function getContainerFeatureValue(name, containerKey, get) {
  switch (name) {
    case "width":
      return get(containerWidthFamily(containerKey));
    case "height":
      return get(containerHeightFamily(containerKey));
    case "aspect-ratio":
      {
        const width = get(containerWidthFamily(containerKey));
        const height = get(containerHeightFamily(containerKey));
        return width / height;
      }
    case "orientation":
      const width = get(containerWidthFamily(containerKey));
      const height = get(containerHeightFamily(containerKey));
      return width > height ? "landscape" : "portrait";
    case "inline-size":
    case "block-size":
    default:
      return;
  }
}
//# sourceMappingURL=container-query.js.map