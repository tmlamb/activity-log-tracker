"use strict";

import { unstable_transformerPath } from "@expo/metro-config";
import { compile } from "../compiler/index.js";
import { getNativeInjectionCode } from "./injection-code.js";
const worker =
// eslint-disable-next-line @typescript-eslint/no-require-imports
require(unstable_transformerPath);
export async function transform(config, projectRoot, filePath, data, options) {
  const isCss = options.type !== "asset" && /\.(s?css|sass)$/.test(filePath);
  if (options.platform === "web" || !isCss) {
    return worker.transform(config, projectRoot, filePath, data, options);
  }
  const cssFile = await worker.transform(config, projectRoot, filePath, data, {
    ...options,
    platform: "web"
  });
  const css = cssFile.output[0].data.css.code.toString();
  const productionJS = compile(css, {
    ...options.reactNativeCSS,
    filename: filePath,
    projectRoot: projectRoot
  }).stylesheet();
  data = Buffer.from(getNativeInjectionCode([], [productionJS]));
  const transform = await worker.transform(config, projectRoot, `${filePath}.js`, data, options);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  transform.output[0].data.css = {
    skipCache: true,
    code: ""
  };
  return transform;
}
//# sourceMappingURL=metro-transformer.js.map