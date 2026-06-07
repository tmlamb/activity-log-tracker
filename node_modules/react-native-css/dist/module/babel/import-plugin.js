"use strict";

import { resolve } from "path";
import { getInteropRequireDefaultSource } from "./helpers.js";
import { handleReactNativeIdentifierRequire, handleReactNativeImport, handleReactNativeObjectPatternRequire } from "./react-native.js";
import { handleReactNativeWebIdentifierRequire, handleReactNativeWebImport, handleReactNativeWebObjectPatternRequire } from "./react-native-web.js";
export default function ({
  types: t
}) {
  const processed = new WeakSet();
  const thisModuleDist = resolve(__dirname, "../../../dist");
  const thisModuleSrc = resolve(__dirname, "../../../src");
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
        const statements = handleReactNativeImport(path.node, t, state.filename) ?? handleReactNativeWebImport(path.node, t, state.filename);
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
          statements = handleReactNativeIdentifierRequire(path, t, id.name, initArg.value, state.filename) ?? handleReactNativeWebIdentifierRequire(path, t, id.name, initArg.value, state.filename);
        } else if (t.isObjectPattern(id) && t.isIdentifier(init.callee, {
          name: "require"
        }) && t.isStringLiteral(initArg)) {
          statements = handleReactNativeObjectPatternRequire(path, t, id, initArg.value, state.filename) ?? handleReactNativeWebObjectPatternRequire(path, t, id, initArg.value, state.filename);
        } else if (t.isIdentifier(id) && t.isIdentifier(init.callee, {
          name: "_interopRequireDefault"
        })) {
          // `const <id> = _interopRequireDefault(require(<source>));`
          const source = getInteropRequireDefaultSource(init, t);
          if (!source) {
            return;
          }
          statements = handleReactNativeWebIdentifierRequire(path, t, id.name, source, state.filename);
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