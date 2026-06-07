import { type NodePath } from "@babel/traverse";
import tBabelTypes, { type ImportDeclaration, type ObjectPattern, type Statement, type VariableDeclaration } from "@babel/types";
type BabelTypes = typeof tBabelTypes;
export declare function handleReactNativeWebImport(declaration: ImportDeclaration, t: BabelTypes, filename: string): Statement[] | undefined;
export declare function handleReactNativeWebIdentifierRequire(path: NodePath<VariableDeclaration>, t: BabelTypes, id: string, source: string, filename: string): tBabelTypes.VariableDeclaration[] | undefined;
export declare function handleReactNativeWebObjectPatternRequire(path: NodePath<VariableDeclaration>, t: BabelTypes, id: ObjectPattern, source: string, filename: string): tBabelTypes.Statement[] | undefined;
export {};
//# sourceMappingURL=react-native-web.d.ts.map