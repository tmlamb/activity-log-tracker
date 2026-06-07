"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nativeResolver = nativeResolver;
exports.webResolver = webResolver;
var _nodePath = require("node:path");
var _allowedModules = require("../babel/allowedModules.js");
const thisModuleDist = (0, _nodePath.resolve)(__dirname, "../../../dist");
const thisModuleSrc = (0, _nodePath.resolve)(__dirname, "../../../src");
function isFromThisModule(filename) {
  return filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc);
}
function nativeResolver(resolver, context, moduleName, platform) {
  const resolution = resolver(context, moduleName, platform);
  const isInternal = isFromThisModule(context.originModulePath);
  const isReactNativeIndex = context.originModulePath.endsWith(`${_nodePath.sep}react-native${_nodePath.sep}index.js`);
  if (isInternal || resolution.type !== "sourceFile" || isReactNativeIndex) {
    return resolution;
  }
  if (moduleName === "react-native") {
    return resolver(context, `react-native-css/components`, platform);
  } else if (moduleName === "react-native-safe-area-context") {
    return resolver(context, `react-native-css/components/react-native-safe-area-context`, platform);
  } else if (resolution.filePath.includes(`${_nodePath.sep}react-native${_nodePath.sep}Libraries${_nodePath.sep}`)) {
    const filename = (0, _nodePath.basename)(resolution.filePath.split(_nodePath.sep).at(-1) ?? "");
    const module = filename.split(".").at(0);
    if (module && _allowedModules.allowedModules.has(module)) {
      return resolver(context, `react-native-css/components/${module}`, platform);
    }
  }
  return resolution;
}
function webResolver(resolver, context, moduleName, platform) {
  const resolution = resolver(context, moduleName, platform);
  if (
  // Don't include our internal files
  isFromThisModule(context.originModulePath) ||
  // Only operate on source files
  resolution.type !== "sourceFile" ||
  // Skip anything that isn't importing from `react-native-web`
  !resolution.filePath.includes(`${_nodePath.sep}react-native-web${_nodePath.sep}`) ||
  // Skip internal react-native-web files
  resolution.filePath.includes(`${_nodePath.sep}react-native-web${_nodePath.sep}dist${_nodePath.sep}vendor`)) {
    return resolution;
  }

  // We only care about `react-native-web/<segment>/<segment>/<module>/index.js` components
  const segments = resolution.filePath.split(_nodePath.sep);
  const isIndex = segments.at(-1)?.startsWith("index.");
  const module = segments.at(-2);
  if (!isIndex || !module || !_allowedModules.allowedModules.has(module) || module === "VirtualizedList") {
    return resolution;
  }
  return resolver(context, `react-native-css/components/${module}`, platform);
}
//# sourceMappingURL=resolver.js.map