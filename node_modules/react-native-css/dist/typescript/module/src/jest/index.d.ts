import { type CompilerOptions } from "react-native-css/compiler";
declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveAnimatedStyle(style?: unknown): R;
        }
    }
}
export declare const testID = "react-native-css";
export declare function registerCSS(css: string, options?: CompilerOptions & {
    debug?: boolean;
}): {
    stylesheet: () => import("react-native-css/compiler").ReactNativeCssStyleSheet;
    warnings: () => {
        properties?: string[];
        values?: Record<string, unknown[]>;
        functions?: string[];
    };
};
export declare function compileWithAutoDebug(css: string, { debug, ...options }?: CompilerOptions & {
    debug?: boolean | "verbose";
}): {
    stylesheet: () => import("react-native-css/compiler").ReactNativeCssStyleSheet;
    warnings: () => {
        properties?: string[];
        values?: Record<string, unknown[]>;
        functions?: string[];
    };
};
//# sourceMappingURL=index.d.ts.map