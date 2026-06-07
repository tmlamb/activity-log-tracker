"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
var _path = require("path");
var _helpers = require("./helpers.js");
var _reactNative = require("./react-native.js");
var _reactNativeWeb = require("./react-native-web.js");
function _default({
  types: t
}) {
  const processed = new WeakSet();
  const thisModuleDist = (0, _path.resolve)(__dirname, "../../../dist");
  const thisModuleSrc = (0, _path.resolve)(__dirname, "../../../src");
  function isFromThisModule(filename) {
    return filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc);
  }
  return {
    name: "Rewrite react-native to react-native-css",
    visitor: {
      ImportDeclaration(path, state) {
        if (processed.has(path) || processed.has(path.node) || isFromThisModule(state.filename)) {
          return;
        }
        const statements = (0, _reactNative.handleReactNativeImport)(path.node, t, state.filename) ?? (0, _reactNativeWeb.handleReactNativeWebImport)(path.node, t, state.filename);
        if (!statements) {
          return;
        }
        for (const statement of statements) {
          processed.add(statement);
        }
        path.replaceWithMultiple(statements);
      },
      VariableDeclaration(path, state) {
        if (processed.has(path) || processed.has(path.node) || isFromThisModule(state.filename)) {
          return;
        }
        const firstDeclaration = path.node.declarations.at(0);

        // We only handle single variable declarations for now.
        if (path.node.declarations.length > 1) {
          return;
        }

        // Skip declarations that are not initialized. eg `let x;`
        if (!firstDeclaration?.init) {
          return;
        }
        const {
          id,
          init
        } = firstDeclaration;

        // We only handle `const <id> = <init>()`
        if (!t.isCallExpression(init)) {
          return;
        }

        // We only handle `const id = <init>() OR const { <id> } = <init>()`
        if (!(t.isIdentifier(id) || t.isObjectPattern(id))) {
          return;
        }
        const initArg = init.arguments.at(0);
        if (!initArg) {
          return;
        }
        let statements;

        // `const <id> = require(<source>);`
        if (t.isIdentifier(id) && t.isIdentifier(init.callee, {
          name: "require"
        }) && t.isStringLiteral(initArg)) {
          statements = (0, _reactNative.handleReactNativeIdentifierRequire)(path, t, id.name, initArg.value, state.filename) ?? (0, _reactNativeWeb.handleReactNativeWebIdentifierRequire)(path, t, id.name, initArg.value, state.filename);
        } else if (t.isObjectPattern(id) && t.isIdentifier(init.callee, {
          name: "require"
        }) && t.isStringLiteral(initArg)) {
          statements = (0, _reactNative.handleReactNativeObjectPatternRequire)(path, t, id, initArg.value, state.filename) ?? (0, _reactNativeWeb.handleReactNativeWebObjectPatternRequire)(path, t, id, initArg.value, state.filename);
        } else if (t.isIdentifier(id) && t.isIdentifier(init.callee, {
          name: "_interopRequireDefault"
        })) {
          // `const <id> = _interopRequireDefault(require(<source>));`
          const source = (0, _helpers.getInteropRequireDefaultSource)(init, t);
          if (!source) {
            return;
          }
          statements = (0, _reactNativeWeb.handleReactNativeWebIdentifierRequire)(path, t, id.name, source, state.filename);
        }
        if (!statements) {
          return;
        }
        for (const statement of statements) {
          processed.add(statement);
        }
        path.replaceWithMultiple(statements);
      }
    }
  };
}
//# sourceMappingURL=import-plugin.js.map