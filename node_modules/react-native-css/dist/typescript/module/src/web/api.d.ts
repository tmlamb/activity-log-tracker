import { type ComponentPropsWithRef, type PropsWithChildren } from "react";
import type { ColorScheme, Props, StyledConfiguration, StyledOptions, StyledProps } from "react-native-css";
import type { ReactComponent } from "../runtime.types";
export declare const styled: <const C extends ReactComponent, const M extends StyledConfiguration<C>>(baseComponent: C, mapping?: M, _options?: StyledOptions) => (props: StyledProps<ComponentPropsWithRef<C>, M>) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
export declare const useCssElement: <C extends ReactComponent>(component: C, incomingProps: Props, mapping: StyledConfiguration<C>) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
export declare const colorScheme: ColorScheme;
/**
 * @deprecated Use `<VariableContextProvider />` instead.
 */
export declare function vars(variables: Record<string, string | number>): Record<string, string>;
export declare function VariableContextProvider(props: PropsWithChildren<{
    value: Record<`--${string}`, string | number>;
}>): import("react/jsx-runtime").JSX.Element;
export declare const useNativeVariable: () => never;
export declare const useUnstableNativeVariable: () => never;
//# sourceMappingURL=api.d.ts.map