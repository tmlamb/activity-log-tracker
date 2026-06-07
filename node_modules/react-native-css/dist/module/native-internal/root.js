"use strict";

import { Platform, PlatformColor } from "react-native";
import { testMediaQuery } from "../native/conditions/media-query.js";
import { family, observable } from "../native/reactivity.js";
const rootVariableFamily = () => {
  return family(() => {
    const obs = observable((read, variableValue) => {
      if (!variableValue) return undefined;
      for (const [value, mediaQuery] of variableValue) {
        if (!mediaQuery) {
          return value;
        }
        if (testMediaQuery(mediaQuery, read)) {
          return value;
        }
      }
      return undefined;
    });
    return obs;
  });
};
export const rootVariables = rootVariableFamily();
export const universalVariables = rootVariableFamily();
rootVariables("__rn-css-rem").set([[14]]);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
rootVariables("__rn-css-color").set([[Platform.OS === "ios" ? PlatformColor("label", "labelColor") : PlatformColor("?attr/textColorPrimary", "SystemBaseHighColor")]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
]);
//# sourceMappingURL=root.js.map