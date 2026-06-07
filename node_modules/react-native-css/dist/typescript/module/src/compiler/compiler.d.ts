import type { CompilerOptions } from "./compiler.types";
/**
 * Converts a CSS file to a collection of style declarations that can be used with the StyleSheet API
 *
 * @param code - The CSS file contents
 * @param options - Compiler options
 * @returns A `ReactNativeCssStyleSheet` that can be passed to `StyleSheet.register` or used with a custom runtime
 */
export declare function compile(code: Buffer | string, options?: CompilerOptions): {
    stylesheet: () => import("./compiler.types").ReactNativeCssStyleSheet;
    warnings: () => {
        properties?: string[];
        values?: Record<string, unknown[]>;
        functions?: string[];
    };
};
//# sourceMappingURL=compiler.d.ts.map