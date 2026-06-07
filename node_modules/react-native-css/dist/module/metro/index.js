"use strict";

/* eslint-disable */
import { versions } from "node:process";
import { nativeResolver, webResolver } from "./resolver.js";
import { setupTypeScript } from "./typescript.js";
const metroOverrideResolution = {
  type: "sourceFile",
  filePath: require.resolve("./override")
};
export function withReactNativeCSS(config, options) {
  if (typeof config === "function") {
    return async () => {
      return withReactNativeCSS(await config(), options);
    };
  }
  if (Number(versions.node.split(".")[0]) < 20) {
    throw new Error("react-native-css only supports NodeJS >20");
  }
  const {
    disableTypeScriptGeneration,
    typescriptEnvPath,
    globalClassNamePolyfill = false
  } = options || {};
  if (disableTypeScriptGeneration !== true) {
    setupTypeScript(typescriptEnvPath);
  }
  return {
    ...config,
    transformerPath: require.resolve("./metro-transformer"),
    transformer: {
      ...config.transformer,
      reactNativeCSS: options
    },
    resolver: {
      ...config.resolver,
      sourceExts: [...(config?.resolver?.sourceExts || []), "css"],
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName.includes("react-native-css-metro-override")) {
          return metroOverrideResolution;
        }
        const parentResolver = config.resolver?.resolveRequest ?? context.resolveRequest;

        // Don't hijack the resolution of react-native imports
        if (!globalClassNamePolyfill) {
          return parentResolver(context, moduleName, platform);
        }
        const resolver = platform === "web" ? webResolver : nativeResolver;
        const resolved = resolver(parentResolver, context, moduleName, platform);
        return resolved;
      }
    }
  };
}
//# sourceMappingURL=index.js.map