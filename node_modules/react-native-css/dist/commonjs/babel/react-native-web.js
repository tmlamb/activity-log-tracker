"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleReactNativeWebIdentifierRequire = handleReactNativeWebIdentifierRequire;
exports.handleReactNativeWebImport = handleReactNativeWebImport;
exports.handleReactNativeWebObjectPatternRequire = handleReactNativeWebObjectPatternRequire;
var _path = require("path");
var _allowedModules = require("./allowedModules.js");
function parseReactNativeWebSource(source, filename) {
  if (source.startsWith(".")) {
    source = (0, _path.resolve)(filename, source);
    const internalPath = source.split("react-native-web/dist")[1];
    if (!internalPath) {
      return;
    }

    // Strip the absolute system filepath
    source = `react-native-web/${internalPath}`;
  }
  if (source === "react-native-web") {
    return {
      source: "react-native-css/components"
    };
  } else if (source.startsWith("react-native-web/")) {
    const name = source.split("/").at(-1);
    if (!name || !_allowedModules.allowedModules.has(name)) {
      return;
    }
    return {
      source: `react-native-css/components/${name}`,
      name
    };
  }
  return;
}
function handleReactNativeWebImport(declaration, t, filename) {
  const {
    specifiers,
    source
  } = declaration;
  const rnwSource = parseReactNativeWebSource(source.value, filename);
  if (!rnwSource) {
    return;
  }
  if (specifiers.length === 0) {
    return [t.importDeclaration([], t.stringLiteral("react-native-css/components"))];
  }
  const statements = [];
  for (const specifier of specifiers) {
    if (t.isImportDefaultSpecifier(specifier)) {
      const {
        source: newSource,
        name
      } = rnwSource;
      if (!name) {
        statements.push(t.importDeclaration([t.importDefaultSpecifier(specifier.local)], t.stringLiteral(newSource)));
      } else {
        statements.push(t.importDeclaration([t.importSpecifier(specifier.local, specifier.local)], t.stringLiteral(`react-native-css/components/${name}`)));
      }
    } else if (t.isImportNamespaceSpecifier(specifier)) {
      statements.push(t.importDeclaration([specifier], t.stringLiteral("react-native-css/components")));
    } else {
      const localName = t.isStringLiteral(specifier.imported) ? specifier.imported.value : specifier.imported.name;
      if (!_allowedModules.allowedModules.has(localName)) {
        statements.push(t.importDeclaration([specifier], source));
      } else {
        statements.push(t.importDeclaration([t.importSpecifier(specifier.local, specifier.imported)], t.stringLiteral(`react-native-css/components/${localName}`)));
      }
    }
  }
  return statements;
}
function handleReactNativeWebIdentifierRequire(path, t, id, source, filename) {
  const parsedSource = parseReactNativeWebSource(source, filename);
  if (!parsedSource) {
    return;
  }
  const {
    source: newSource,
    name
  } = parsedSource;
  if (name) {
    return [t.variableDeclaration(path.node.kind, [t.variableDeclarator(t.objectPattern([name === id ? t.objectProperty(t.identifier(name), t.identifier(id), false, true) : t.objectProperty(t.identifier(name), t.identifier(id))]), t.callExpression(t.identifier("require"), [t.stringLiteral(newSource)]))])];
  } else {
    return [t.variableDeclaration(path.node.kind, [t.variableDeclarator(t.identifier(id), t.callExpression(t.identifier("require"), [t.stringLiteral(newSource)]))])];
  }
}
function handleReactNativeWebObjectPatternRequire(path, t, id, source, filename) {
  const parsedSource = parseReactNativeWebSource(source, filename);

  // Don't handle `const { Text } = require('react-native-web/dist/cjs/Text');` - we only handle package exports
  if (!parsedSource || parsedSource.name) {
    return;
  }
  const statements = [];
  for (const identifier of id.properties) {
    if (t.isRestElement(identifier)) {
      // Bail out on `const { ...rest } = require('react-native-web');`
      // We need to exit as we do not handle `const { Text, ...rest } = require('react-native-web');`
      return;
    } else if (!(t.isIdentifier(identifier.value) && t.isIdentifier(identifier.key))) {
      // Bail out on anything that isn't `const { <key>: <identifier> } = require('react-native-web');`
      return;
    } else {
      const name = identifier.key.name;
      if (!_allowedModules.allowedModules.has(name)) {
        statements.push(t.variableDeclaration(path.node.kind, [t.variableDeclarator(t.objectPattern([identifier]), t.callExpression(t.identifier("require"), [t.stringLiteral(source)]))]));
      } else {
        const newSourceWithName = `react-native-css/components/${name}`;
        statements.push(t.variableDeclaration(path.node.kind, [t.variableDeclarator(t.objectPattern([t.objectProperty(t.identifier(name), t.identifier(identifier.value.name), false, true)]), t.callExpression(t.identifier("require"), [t.stringLiteral(newSourceWithName)]))]));
      }
    }
  }
  return statements;
}
//# sourceMappingURL=react-native-web.js.map