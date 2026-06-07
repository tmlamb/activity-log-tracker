import { type Context } from "react";
import type { Animation, ReactNativeCssStyleSheet, StyleRuleSet } from "react-native-css/compiler";
import { family, type Observable, type VariableContextValue } from "../native/reactivity";
import { rootVariables, universalVariables } from "./root";
export { rootVariables, universalVariables };
interface StyleCollectionType {
    styles: ReturnType<typeof family<string, Observable<StyleRuleSet>>>;
    keyframes: ReturnType<typeof family<string, Observable<Animation[1]>>>;
    inject: (options: ReactNativeCssStyleSheet) => void;
}
declare global {
    var __react_native_css_style_collection: StyleCollectionType | undefined;
    var __react_native_css_variable_context: Context<VariableContextValue> | undefined;
}
export declare const StyleCollection: StyleCollectionType;
//# sourceMappingURL=style-collection.d.ts.map