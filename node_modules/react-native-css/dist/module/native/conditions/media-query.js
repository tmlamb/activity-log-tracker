"use strict";

/* eslint-disable */
import { I18nManager, PixelRatio, Platform } from "react-native";
import { colorScheme, vh, vw } from "../reactivity.js";
export function testMediaQuery(mediaQueries, get) {
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
      return I18nManager.isRTL && value === "rtl" || value === "ltr";
    case "hover":
      return true;
    case "platform":
      return value === "native" || value === Platform.OS;
    case "prefers-color-scheme":
      {
        return value === get(colorScheme);
      }
    case "display-mode":
      return value === "native" || Platform.OS === value;
    case "min-width":
      return typeof value === "number" && get(vw) >= value;
    case "max-width":
      return typeof value === "number" && get(vw) <= value;
    case "min-height":
      return typeof value === "number" && get(vh) >= value;
    case "max-height":
      return typeof value === "number" && get(vh) <= value;
    case "orientation":
      return value === "landscape" ? get(vh) < get(vw) : get(vh) >= get(vw);
  }
  if (typeof value !== "number") {
    return false;
  }
  let left;
  const right = value;
  switch (mediaQuery[1]) {
    case "width":
      left = get(vw);
      break;
    case "height":
      left = get(vh);
      break;
    case "resolution":
      left = PixelRatio.get();
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