"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyDeclarations = applyDeclarations;
exports.calculateProps = calculateProps;
var _utilities = require("react-native-css/utilities");
var _objects = require("../objects.js");
var _reactivity = require("../reactivity.js");
var _defaults = require("./defaults.js");
var _resolve = require("./resolve.js");
/* eslint-disable */

function calculateProps(get, rules, guards = [], inheritedVariables = {
  [_reactivity.VAR_SYMBOL]: true
}, inlineVariables = {
  [_reactivity.VAR_SYMBOL]: "inline"
}) {
  let normal;
  let important;
  const delayedStyles = [];
  const transformStyles = [];
  for (const rule of rules) {
    if (_reactivity.VAR_SYMBOL in rule) {
      if (typeof rule[_reactivity.VAR_SYMBOL] === "string") {
        Object.assign(inlineVariables, rule);
      } else {
        Object.assign(inheritedVariables, rule);
      }
      continue;
    }
    if (rule.v) {
      for (const variable of rule.v) {
        inlineVariables[variable[0]] = variable[1];
      }
    }
    if (rule.d) {
      let topLevelTarget = rule.s?.[_utilities.Specificity.Important] ? important ??= {} : normal ??= {};
      let target = topLevelTarget;
      const ruleTarget = rule.target || "style";
      if (typeof ruleTarget === "string") {
        target = target[ruleTarget] ??= {};
      } else if (ruleTarget) {
        for (const path of ruleTarget) {
          target = target[path] ??= {};
        }
      }
      applyDeclarations(get, rule.d, inlineVariables, inheritedVariables, delayedStyles, transformStyles, guards, target, topLevelTarget);
    }
  }
  for (const delayedStyle of delayedStyles) {
    delayedStyle();
  }
  for (const transformStyle of transformStyles) {
    transformStyle();
  }
  return {
    normal,
    guards,
    important
  };
}
function applyDeclarations(get, declarations, inlineVariables, inheritedVariables, delayedStyles = [], transformStyles = [], guards = [], target = {}, topLevelTarget = target) {
  const originalTarget = target;
  for (const declaration of declarations) {
    target = originalTarget;
    if (!Array.isArray(declaration)) {
      // Static styles
      Object.assign(target, declaration);
    } else {
      // Dynamic styles
      let value = declaration[0];
      let propPath = declaration[1];
      let prop;
      if (Array.isArray(propPath)) {
        const [first, ...rest] = propPath;
        if (!first) {
          continue;
        }
        const final = rest.pop();
        if (final) {
          if (first !== "&") {
            topLevelTarget[first] ??= {};
            target = topLevelTarget[first];
          }
          let previousProp = first;
          let previousTarget = topLevelTarget;
          for (prop of rest) {
            if (prop.startsWith("[") && prop.endsWith("]")) {
              prop = Number(prop.slice(1, -1));
              if (!Array.isArray(previousTarget[previousProp])) {
                previousTarget[previousProp] = [];
                target = previousTarget[previousProp];
              }
            }
            previousTarget = target;
            previousProp = prop;
            target[prop] ??= {};
            target = target[prop];
          }
          prop = final;
        } else {
          target = topLevelTarget;
          prop = first;
        }
      } else {
        prop = propPath;
      }
      const shouldDelay = declaration[2];
      if (shouldDelay || _defaults.transformKeys.has(prop)) {
        /**
         * We need to delay the resolution of this value until after all
         * styles have been calculated. But another style might override
         * this value. So we set a placeholder value and only override
         * if the placeholder is preserved
         *
         * This also ensures the props exist, so setValue will properly
         * mutate the props object and not create a new one
         */
        const originalValue = value;
        // This needs to be a object with the [prop] so we can discover in transform arrays
        value = {
          [prop]: true
        };
        if (_defaults.transformKeys.has(prop)) {
          transformStyles.push(() => {
            value = (0, _resolve.resolveValue)(originalValue, get, {
              inlineVariables,
              inheritedVariables,
              renderGuards: guards,
              calculateProps
            });
            (0, _objects.applyValue)(target, prop, value);
          });
        } else {
          delayedStyles.push(() => {
            if ((0, _objects.getDeepPath)(target, prop) === value) {
              delete target[prop];
              value = (0, _resolve.resolveValue)(originalValue, get, {
                inlineVariables,
                inheritedVariables,
                renderGuards: guards,
                calculateProps
              });
              (0, _objects.applyValue)(target, prop, value);
            }
          });
        }
      } else {
        value = (0, _resolve.resolveValue)(value, get, {
          inlineVariables,
          inheritedVariables,
          renderGuards: guards,
          calculateProps
        });
      }
      (0, _objects.applyValue)(target, prop, value);
    }
  }
}
//# sourceMappingURL=calculate-props.js.map