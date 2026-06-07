"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.allowedModules = void 0;
var _fs = require("fs");
var _path = require("path");
function getFilesWithoutExtension(dirPath) {
  // Read all files and directories inside dirPath synchronously
  const entries = (0, _fs.readdirSync)(dirPath, {
    withFileTypes: true
  });

  // Filter only files (ignore directories)
  const files = entries.filter(entry => entry.isFile() && /\.[jt]sx?$/.exec(entry.name) && !/index\.[jt]sx?$/.exec(entry.name));

  // For each file, get the filename without extension
  const filesWithoutExt = files.map(file => (0, _path.parse)(file.name).name);
  return filesWithoutExt;
}
const allowedModules = exports.allowedModules = new Set(getFilesWithoutExtension((0, _path.join)(__dirname, "../components")));
//# sourceMappingURL=allowedModules.js.map