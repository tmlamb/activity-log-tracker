"use strict";

import { toRNProperty } from "./selectors.js";
import { splitByDelimiter } from "./split-by-delimiter.js";

/***********************************************
 * @react-native                               *
 ***********************************************/

export function maybeMutateReactNativeOptions(rule, _builder) {
  if (rule.type !== "custom" || rule.value?.name !== "react-native") {
    return;
  }

  // TODO: Add inline options
}

/***********************************************
 * @nativeMapping                                       *
 ***********************************************/

function isNativeMappingAtRule(rule) {
  return rule.type === "unknown" && rule.value.name === "nativeMapping";
}
export function parsePropAtRule(rules) {
  // Include any default mapping here
  const mapping = {
    "caret-color": ["cursorColor"],
    "fill": ["fill"],
    "stroke": ["stroke"],
    "stroke-width": ["strokeWidth"],
    "-webkit-line-clamp": ["numberOfLines"],
    "-rn-ripple-color": ["android_ripple", "color"],
    "-rn-ripple-style": ["android_ripple", "borderless"],
    "-rn-ripple-radius": ["android_ripple", "radius"],
    "-rn-ripple-layer": ["android_ripple", "foreground"]
  };
  if (!rules) return mapping;
  for (const rule of rules) {
    if (!isNativeMappingAtRule(rule)) continue;
    if (rule.value.prelude.length > 0) {
      const prelude = rule.value.prelude.filter(item => {
        return item.value.type !== "white-space";
      });
      nativeMappingAtRuleBlock(prelude, mapping);
    } else if (rule.value.block) {
      // Remove all whitespace tokens
      const blocks = rule.value.block.filter(item => {
        return item.value.type !== "white-space";
      });

      // Separate each rule, delimited by a semicolon
      const blockRules = splitByDelimiter(blocks, item => {
        return item.value.type === "semicolon";
      });
      for (const block of blockRules) {
        nativeMappingAtRuleBlock(block, mapping);
      }
    }
  }
  return mapping;
}
function nativeMappingAtRuleBlock(token, mapping = {}) {
  let [from, to] = splitByDelimiter(token, item => {
    return item.value.type === "colon";
  });

  // @nativeMapping <to>; (has no from value)
  if (!to) {
    to = from;
    from = [{
      type: "token",
      value: {
        type: "ident",
        value: "*"
      }
    }];
  }

  // We can only map from a single property
  if (!from || from.length !== 1 || !to) {
    return mapping;
  }
  const fromToken = from[0];
  if (!fromToken || fromToken.value.type !== "ident") {
    return mapping;
  }
  let value = to.flatMap((item, index) => {
    switch (item.value.type) {
      case "delim":
        return index === 0 && item.value.value === "&" ? ["&"] : [];
      case "ident":
        return item.value.value.split(".").map(part => toRNProperty(part));
      default:
        return [];
    }
  });
  if (value.length === 2 && value[0] === "&" && value[1]) {
    value = value[1];
  }
  mapping[toRNProperty(fromToken.value.value)] = value;
  return mapping;
}
//# sourceMappingURL=atRules.js.map