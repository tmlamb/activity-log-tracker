"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transform = transform;
var _metroConfig = require("@expo/metro-config");
var _index = require("../compiler/index.js");
var _injectionCode = require("./injection-code.js");
const worker =
// eslint-disable-next-line @typescript-eslint/no-require-imports
require(_metroConfig.unstable_transformerPath);
async function transform(config, projectRoot, filePath, data, options) {
  const isCss = options.type !== "asset" && /\.(s?css|sass)$/.test(filePath);
  if (options.platform === "web" || !isCss) {
    return worker.transform(config, projectRoot, filePath, data, options);
  }
  const cssFile = await worker.transform(config, projectRoot, filePath, data, {
    ...options,
    platform: "web"
  });
  const css = cssFile.output[0].data.css.code.toString();
  const productionJS = (0, _index.compile)(css, {
    ...options.reactNativeCSS,
    filename: filePath,
    projectRoot: projectRoot
  }).stylesheet();
  data = Buffer.from((0, _injectionCode.getNativeInjectionCode)([], [productionJS]));
  const transform = await worker.transform(config, projectRoot, `${filePath}.js`, data, options);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  transform.output[0].data.css = {
    skipCache: true,
    code: ""
  };
  return transform;
}
//# sourceMappingURL=metro-transformer.js.map