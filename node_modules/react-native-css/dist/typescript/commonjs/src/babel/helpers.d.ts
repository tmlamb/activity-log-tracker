import tBabelTypes, { type CallExpression } from "@babel/types";
export type BabelTypes = typeof tBabelTypes;
export interface PluginOpts {
    target?: string;
    runtime?: string;
    commonjs?: boolean;
}
export interface PluginState {
    opts?: PluginOpts;
    filename: string;
}
export declare function getInteropRequireDefaultSource(init: CallExpression, t: BabelTypes): string | undefined;
//# sourceMappingURL=helpers.d.ts.map