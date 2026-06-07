import type { StyleDescriptor } from "react-native-css/compiler";
import type { ColorScheme, Props, ReactComponent, StyledConfiguration, StyledOptions } from "../runtime.types";
import { useNativeCss } from "./react/useNativeCss";
import { VAR_SYMBOL } from "./reactivity";
export { StyleCollection, VariableContext, VariableContextProvider, } from "react-native-css/native-internal";
export { useNativeCss };
/**
 * Generates a new Higher-Order component the wraps the base component and applies the styles.
 * This is added to the `interopComponents` map so that it can be used in the `wrapJSX` function
 * @param baseComponent
 * @param mapping
 */
export declare const styled: <const C extends ReactComponent<any>, const M extends StyledConfiguration<C>>(baseComponent: C, mapping?: M, options?: StyledOptions) => any;
export declare const colorScheme: ColorScheme;
export declare const useUnstableNativeVariable: typeof useNativeVariable;
export declare const useCssElement: <const C extends ReactComponent<any>, const M extends StyledConfiguration<C>>(component: C, incomingProps: Props, mapping: M) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | import("react").FunctionComponentElement<import("react").FragmentProps>;
export declare function useNativeVariable(name: string): any;
/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export declare function vars(variables: Record<string, StyleDescriptor>): {
    [VAR_SYMBOL]: string;
} & {
    [k: string]: StyleDescriptor;
};
//# sourceMappingURL=api.d.ts.map