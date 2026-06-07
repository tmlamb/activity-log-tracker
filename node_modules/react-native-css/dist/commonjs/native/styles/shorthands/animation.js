"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.animationShorthand = exports.animationName = exports.animation = void 0;
var _nativeInternal = require("react-native-css/native-internal");
var _objects = require("../../objects.js");
var _handler = require("./_handler.js");
/* eslint-disable */

const name = ["animationName", "string", "none"];
const delay = ["animationDelay", "number", 0];
const duration = ["animationDuration", "number", 0];
const iteration = ["animationIterationCount", ["number", "infinite"], 1];
const fill = ["animationFillMode", ["none", "forwards", "backwards", "both"], "none"];
const playState = ["animationPlayState", ["running", "paused"], "running"];
const direction = ["animationDirection", ["normal", "reverse", "alternate", "alternate-reverse"], "normal"];
const timingFunction = ["animationTimingFunction", ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "object"], "ease"];
const animationShorthand = exports.animationShorthand = (0, _handler.shorthandHandler)([[name], [duration, name], [name, duration], [name, duration, iteration], [name, duration, timingFunction, iteration], [duration, delay, name], [duration, delay, iteration, name], [duration, delay, iteration, timingFunction, name], [name, duration, timingFunction, delay, iteration, fill]], [name, delay, direction, duration, fill, iteration, playState, timingFunction], "tuples");
const animation = (resolveValue, value, get, options) => {
  const animationShortHandTuples = animationShorthand(resolveValue, value, get, options);
  if (!Array.isArray(animationShortHandTuples)) {
    return;
  }
  const nameTuple = animationShortHandTuples.find(tuple => tuple[1] === "animationName");
  const name = nameTuple?.[0];
  if (!nameTuple || typeof name !== "string") {
    return;
  }
  const keyframes = get(_nativeInternal.StyleCollection.keyframes(name));
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
  return (0, _objects.applyShorthand)(animationShortHandTuples);
};
exports.animation = animation;
const animationName = (resolveValue, value, get, options) => {
  const shorthand = animation(resolveValue, value, get, options);
  return shorthand.animationName;
};
exports.animationName = animationName;
//# sourceMappingURL=animation.js.map