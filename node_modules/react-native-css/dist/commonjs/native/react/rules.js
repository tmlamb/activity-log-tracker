"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.INLINE_RULE_SYMBOL = void 0;
exports.generateHash = generateHash;
exports.generateStateHash = generateStateHash;
exports.updateRules = updateRules;
var _nativeInternal = require("react-native-css/native-internal");
var _index = require("../conditions/index.js");
var _containerQuery = require("../conditions/container-query.js");
var _objects = require("../objects.js");
var _reactivity = require("../reactivity.js");
var _index2 = require("../styles/index.js");
/* eslint-disable */

const INLINE_RULE_SYMBOL = exports.INLINE_RULE_SYMBOL = Symbol("react-native-css.inlineRule");
function updateRules(state,
// Either update the state with new props or use the current props
currentProps = state.currentProps, inheritedVariables = state.inheritedVariables, inheritedContainers = state.inheritedContainers, forceUpdate = false, isRerender = true) {
  const guards = [];
  const rules = new Set();
  if (forceUpdate) {
    state = {
      ...state,
      guards,
      currentProps
    };
  }
  let usesVariables = false;
  let variables;
  let containers;
  const inlineVariables = new Set();
  let animated = false;
  let pressable = false;
  for (const config of state.configs) {
    const source = currentProps?.[config.source];
    const shallowTarget = Array.isArray(config.target) ? config.target[0] : config.target;
    guards.push(["a", config.source, source]);
    if (shallowTarget) {
      guards.push(["a", shallowTarget, currentProps?.[shallowTarget]]);
    }
    const styleRuleSet = [];
    if (typeof source === "string") {
      const classNames = source.split(/\s+/);
      for (const className of classNames) {
        styleRuleSet.push(..._nativeInternal.StyleCollection.styles(className).get(state.ruleEffect));
      }
    }
    const target = (0, _objects.getDeepPath)(currentProps, config.target);
    if (target) {
      if (Array.isArray(target)) {
        for (const item of target) {
          // undefined or falsy is allowed in the style array
          if (!item) {
            continue;
          }
          if (_reactivity.VAR_SYMBOL in item) {
            inlineVariables.add(item);
          } else if (INLINE_RULE_SYMBOL in item && typeof item[INLINE_RULE_SYMBOL] === "string") {
            pushInlineRule(state, item, styleRuleSet);
          }
        }
      } else if (config.target && typeof target === "object" && target && _reactivity.VAR_SYMBOL in target) {
        inlineVariables.add(target);
      } else if (INLINE_RULE_SYMBOL in target && typeof target[INLINE_RULE_SYMBOL] === "string") {
        pushInlineRule(state, target, styleRuleSet);
      }
    }
    for (let rule of styleRuleSet) {
      usesVariables ||= Boolean(rule.dv);

      // We do this even if the rule doesn't match so we can maintain a consistent render tree
      // We we need to inject React context
      if (rule.a) animated = true;
      if (rule.v) {
        variables ??= inheritedVariables;
      }
      if (rule.c) {
        containers ??= inheritedContainers;
        (0, _reactivity.activeFamily)(state.ruleEffectGetter);
      }
      if (!(0, _index.testRule)(rule, state.ruleEffectGetter, currentProps, guards, inheritedContainers)) {
        continue;
      }
      if (rule.v) {
        if (variables === inheritedVariables) {
          variables = {
            ...inheritedVariables
          };
        }
        for (const v of rule.v) {
          variables[v[0]] = v[1];
        }
      }
      if (rule.c) {
        // We're going to set a value, so we need to create a new object
        if (containers === inheritedContainers) {
          containers = {
            ...inheritedContainers,
            // This container becomes the default container
            [_containerQuery.DEFAULT_CONTAINER_NAME]: state.ruleEffectGetter
          };
        }

        // This this component as the named container
        for (const name of rule.c) {
          containers[name] = state.ruleEffectGetter;
        }

        // Enable hover/active/focus/layout handlers
        (0, _reactivity.hoverFamily)(state.ruleEffectGetter);
        (0, _reactivity.activeFamily)(state.ruleEffectGetter);
        (0, _reactivity.focusFamily)(state.ruleEffectGetter);
        (0, _reactivity.containerLayoutFamily)(state.ruleEffectGetter);
      }
      if (rule.a) {
        animated = true;
      }

      // Rules normally target style. If the target is not style, we need to create a new rule.
      if (config.target !== "style") {
        rule = getRuleVariation(rule)(config);
      }

      // Add the rule to the set and update the hash
      rules.add(rule);
    }
    if (process.env.NODE_ENV !== "production") {
      if (isRerender) {
        const pressable = _reactivity.activeFamily.has(state.ruleEffectGetter);
        if (Boolean(variables) !== Boolean(state.variables)) {
          console.log(`ReactNativeCss: className '${source}' added or removed a variable after the initial render. This causes the components state to be reset and all children be re-mounted. Use the className 'will-change-variable' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`);
        } else if (Boolean(containers) !== Boolean(state.containers)) {
          console.log(`ReactNativeCss: className '${source}' added or removed a container after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-container' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`);
        } else if (animated !== state.animated) {
          console.log(`ReactNativeCss: className '${source}' added or removed an animation after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-animation' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`);
        } else if (pressable !== state.pressable) {
          console.log(`ReactNativeCss: className '${source}' added or removed a pressable state after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-pressable' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`);
        }
      }
    }
  }
  pressable = _reactivity.activeFamily.has(state.ruleEffectGetter);
  if (!rules.size && !state.stylesObs && !inlineVariables.size) {
    return {
      ...state,
      currentProps,
      guards,
      animated,
      pressable,
      variables,
      containers
    };
  }
  if (usesVariables || variables) {
    rules.add(inheritedVariables);
    if (inlineVariables.size) {
      variables = Object.assign({}, variables, inheritedVariables, ...Array.from(inlineVariables), {
        [_reactivity.VAR_SYMBOL]: true
      });
    }
    for (const variable of inlineVariables) {
      rules.add(variable);
    }
  }

  // Generate a StyleObservable for this unique set of rules / variables
  const stylesObs = (0, _index2.stylesFamily)(generateStateHash(state, rules), rules);

  // Get the guards without subscribing to the observable
  // We will subscribe within the render using the StyleEffect
  guards.push(...stylesObs.get().guards);

  // If these are the same styles with no inline variables, we can skip the update
  if (state.stylesObs === stylesObs && !inlineVariables.size) {
    return state;
  }

  // Remove this component from the old observer
  state.stylesObs?.cleanup(state.ruleEffect);
  return {
    ...state,
    currentProps,
    stylesObs,
    variables,
    containers,
    guards,
    animated,
    pressable
  };
}

/**
 * Create variations of a style rule based on the config.
 * Cache for reference equality.
 */
const getRuleVariation = (0, _reactivity.weakFamily)(rule => {
  return (0, _reactivity.weakFamily)(config => {
    return {
      ...rule,
      target: config.target
    };
  });
});
function pushInlineRule(state, item, styleRuleSet) {
  for (const className of item[INLINE_RULE_SYMBOL].split(/\s+/)) {
    let inlineRuleSet = _nativeInternal.StyleCollection.styles(className).get(state.ruleEffect);
    for (let rule of inlineRuleSet) {
      styleRuleSet.push(rule);
    }
  }
}

/**
 * Get a unique number for a weak key.
 */
let hashKeyCount = 0;
const hashKeyFamily = (0, _reactivity.weakFamily)(() => hashKeyCount++);
function generateStateHash(state, iterableKeys, variables, inlineVars) {
  if (!iterableKeys) {
    return "";
  }
  const keys = [state.configs, ...iterableKeys];
  if (variables) {
    keys.push(variables);
  }
  if (inlineVars) {
    keys.push(...inlineVars);
  }
  return generateHash(keys);
}

/**
 * Quickly generate a unique hash for a set of numbers.
 * This is not a cryptographic hash, but it is fast and has a low chance of collision.
 */
const MOD = 9007199254740871; // Largest prime within safe integer range 2^53
const PRIME = 31; // A smaller prime for mixing
function generateHash(keys) {
  let hash = 0;
  let product = 1; // Used for mixing to enhance uniqueness

  for (const key of keys) {
    if (!key) continue; // Skip if key is undefined

    const num = hashKeyFamily(key);
    hash = (hash ^ num) % MOD; // XOR and modular arithmetic
    product = product * (num + PRIME) % MOD; // Mix with multiplication
  }

  // Combine hash and product to form the final hash
  hash = (hash + product) % MOD;

  // Return the hash as a string
  return hash.toString(36);
}
//# sourceMappingURL=rules.js.map