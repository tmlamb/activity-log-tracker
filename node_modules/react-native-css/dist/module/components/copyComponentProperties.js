"use strict";

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export function copyComponentProperties(BaseComponent, Component) {
  for (const [key, value] of Object.entries(BaseComponent)) {
    if (key === "$$typeof" || key === "render" || key === "contextType") {
      continue;
    }
    Component[key] = value;
  }
  Component.displayName = BaseComponent.displayName;
  return Component;
}
//# sourceMappingURL=copyComponentProperties.js.map