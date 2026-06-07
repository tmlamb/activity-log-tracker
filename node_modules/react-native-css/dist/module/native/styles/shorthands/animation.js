"use strict";

/* eslint-disable */
import { StyleCollection } from "react-native-css/native-internal";
import { applyShorthand } from "../../objects.js";
import { shorthandHandler } from "./_handler.js";
const name = ["animationName", "string", "none"];
const delay = ["animationDelay", "number", 0];
const duration = ["animationDuration", "number", 0];
const iteration = ["animationIterationCount", ["number", "infinite"], 1];
const fill = ["animationFillMode", ["none", "forwards", "backwards", "both"], "none"];
const playState = ["animationPlayState", ["running", "paused"], "running"];
const direction = ["animationDirection", ["normal", "reverse", "alternate", "alternate-reverse"], "normal"];
const timingFunction = ["animationTimingFunction", ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "object"], "ease"];
export const animationShorthand = shorthandHandler([[name], [duration, name], [name, duration], [name, duration, iteration], [name, duration, timingFunction, iteration], [duration, delay, name], [duration, delay, iteration, name], [duration, delay, iteration, timingFunction, name], [name, duration, timingFunction, delay, iteration, fill]], [name, delay, direction, duration, fill, iteration, playState, timingFunction], "tuples");
export const animation = (resolveValue, value, get, options) => {
  const animationShortHandTuples = animationShorthand(resolveValue, value, get, options);
  if (!Array.isArray(animationShortHandTuples)) {
    return;
  }
  const nameTuple = animationShortHandTuples.find(tuple => tuple[1] === "animationName");
  const name = nameTuple?.[0];
  if (!nameTuple || typeof name !== "string") {
    return;
  }
  const keyframes = get(StyleCollection.keyframes(name));
  const animation = {};
  for (const [progress, declarations] of keyframes) {
    animation[progress] ??= {};
    const props = options.calculateProps?.(get,
    // Cast this into a StyleRule[]
    [{
      s: [0],
      d: declarations
    }], options.renderGuards, options.inheritedVariables, options.inlineVariables);
    if (!props) {
      continue;
    }
    if (props.normal) {
      Object.assign(animation[progress], props.normal);
    }
    if (props.important) {
      Object.assign(animation[progress], props.important);
    }
    animation[progress] = animation[progress].style;
  }
  nameTuple[0] = animation;
  return applyShorthand(animationShortHandTuples);
};
export const animationName = (resolveValue, value, get, options) => {
  const shorthand = animation(resolveValue, value, get, options);
  return shorthand.animationName;
};
//# sourceMappingURL=animation.js.map