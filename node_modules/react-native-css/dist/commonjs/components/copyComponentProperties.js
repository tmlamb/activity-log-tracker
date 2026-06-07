"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyComponentProperties = copyComponentProperties;
// eslint-disable-next-line @typescript-eslint/no-explicit-any

function copyComponentProperties(BaseComponent, Component) {
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