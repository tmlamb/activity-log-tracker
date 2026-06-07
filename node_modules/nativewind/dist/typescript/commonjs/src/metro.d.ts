import type { MetroConfig } from "metro-config";
import { type WithReactNativeCSSOptions } from "react-native-css/metro";
export declare function withNativewind<T extends MetroConfig | (() => Promise<MetroConfig>)>(config: T, options?: WithReactNativeCSSOptions): T;
/**
 * @deprecated use `withNativewind` instead
 */
export declare const withNativeWind: typeof withNativewind;
//# sourceMappingURL=metro.d.ts.map