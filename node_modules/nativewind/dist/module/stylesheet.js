"use strict";

import { Appearance, useColorScheme as useRNColorScheme } from "react-native";

/** @deprecated Use useColorScheme from "react-native" instead */
export function useColorScheme() {
  return {
    colorScheme: useRNColorScheme(),
    setColorScheme(scheme) {
      Appearance.setColorScheme(scheme);
    },
    toggleColorScheme() {
      Appearance.setColorScheme(Appearance.getColorScheme() === "dark" ? "light" : "dark");
    }
  };
}
//# sourceMappingURL=stylesheet.js.map