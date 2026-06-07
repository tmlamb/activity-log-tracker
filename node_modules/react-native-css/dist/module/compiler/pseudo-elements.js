"use strict";

import { isStyleFunction } from "../utilities/index.js";
export function modifyRuleForSelection(rule) {
  if (!rule.d) {
    return;
  }
  rule.d = rule.d.flatMap(declaration => {
    return modifyStyleDeclaration(declaration, "color", "selectionColor");
  });
  return rule;
}
export function modifyRuleForPlaceholder(rule) {
  if (!rule.d) {
    return;
  }
  rule.d = rule.d.flatMap(declaration => {
    return modifyStyleDeclaration(declaration, "color", "placeholderTextColor");
  });
  return rule;
}
function modifyStyleDeclaration(declaration, from, to) {
  if (Array.isArray(declaration)) {
    if (isStyleFunction(declaration) && declaration[2] === from) {
      declaration = [...declaration];
      declaration[2] = [to];
      return [declaration];
    } else if (declaration[1] === from) {
      declaration = [...declaration];
      declaration[1] = [to];
      return [declaration];
    }
  } else if (typeof declaration === "object") {
    const {
      color: selectionColor,
      ...rest
    } = declaration;
    if (selectionColor) {
      return [rest, [selectionColor, [to]]];
    }
  }
  return [declaration];
}
//# sourceMappingURL=pseudo-elements.js.map