"use strict";

export function getInteropRequireDefaultSource(init, t) {
  if (!t.isIdentifier(init.callee, {
    name: "_interopRequireDefault"
  })) {
    return;
  }
  const interopArg = init.arguments.at(0);
  if (!t.isCallExpression(interopArg) || !t.isIdentifier(interopArg.callee, {
    name: "require"
  })) {
    return;
  }
  const requireArg = interopArg.arguments.at(0);
  if (!t.isStringLiteral(requireArg)) {
    return;
  }
  return requireArg.value;
}
//# sourceMappingURL=helpers.js.map