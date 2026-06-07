import type { MetroConfig } from "metro-config";
import { type CompilerOptions } from "../compiler";
export interface WithReactNativeCSSOptions extends CompilerOptions {
    typescriptEnvPath?: string;
    disableTypeScriptGeneration?: boolean;
    /** Add className to all React Native primitives. Defaults false */
    globalClassNamePolyfill?: boolean;
    hexColors?: boolean;
}
export declare function withReactNativeCSS<T extends MetroConfig | (() => Promise<MetroConfig>)>(config: T, options?: WithReactNativeCSSOptions): T;
//# sourceMappingURL=index.d.ts.map