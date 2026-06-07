"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testMediaQuery = testMediaQuery;
var _reactNative = require("react-native");
var _reactivity = require("../reactivity.js");
/* eslint-disable */

function testMediaQuery(mediaQueries, get) {
  return mediaQueries.every(query => test(query, get));
}
function test(mediaQuery, get) {
  switch (mediaQuery[0]) {
    case "[]":
    case "!!":
      return false;
    case "!":
      return !test(mediaQuery[1], get);
    case "&":
      return mediaQuery[1].every(query => {
        return test(query, get);
      });
    case "|":
      return mediaQuery[1].some(query => {
        return test(query, get);
      });
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=":
      {
        return testComparison(mediaQuery, get);
      }
  }
}
function testComparison(mediaQuery, get) {
  const value = mediaQuery[2];
  switch (mediaQuery[1]) {
    case "dir":
      return _reactNative.I18nManager.isRTL && value === "rtl" || value === "ltr";
    case "hover":
      return true;
    case "platform":
      return value === "native" || value === _reactNative.Platform.OS;
    case "prefers-color-scheme":
      {
        return value === get(_reactivity.colorScheme);
      }
    case "display-mode":
      return value === "native" || _reactNative.Platform.OS === value;
    case "min-width":
      return typeof value === "number" && get(_reactivity.vw) >= value;
    case "max-width":
      return typeof value === "number" && get(_reactivity.vw) <= value;
    case "min-height":
      return typeof value === "number" && get(_reactivity.vh) >= value;
    case "max-height":
      return typeof value === "number" && get(_reactivity.vh) <= value;
    case "orientation":
      return value === "landscape" ? get(_reactivity.vh) < get(_reactivity.vw) : get(_reactivity.vh) >= get(_reactivity.vw);
  }
  if (typeof value !== "number") {
    return false;
  }
  let left;
  const right = value;
  switch (mediaQuery[1]) {
    case "width":
      left = get(_reactivity.vw);
      break;
    case "height":
      left = get(_reactivity.vh);
      break;
    case "resolution":
      left = _reactNative.PixelRatio.get();
      break;
    default:
      return false;
  }
  switch (mediaQuery[0]) {
    case "=":
      return left === right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      return false;
  }
}
//# sourceMappingURL=media-query.js.map