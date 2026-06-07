import type { InlineVariable, StyleDescriptor, StyleFunction } from "react-native-css/compiler";
import type { RenderGuard } from "../conditions/guards";
import { type Getter, type VariableContextValue } from "../reactivity";
import type { calculateProps } from "./calculate-props";
export type SimpleResolveValue = (value: StyleDescriptor, castToArray?: boolean) => unknown;
export type StyleFunctionResolver = (resolveValue: SimpleResolveValue, value: StyleFunction, get: Getter, options: ResolveValueOptions) => unknown;
export type StyleResolver = (resolveValue: SimpleResolveValue, value: StyleDescriptor, get: Getter, options: ResolveValueOptions) => unknown;
export type ResolveValueOptions = {
    castToArray?: boolean;
    inheritedVariables?: VariableContextValue;
    inlineVariables?: InlineVariable | undefined;
    renderGuards?: RenderGuard[];
    variableHistory?: Set<string>;
    /** Pass down to perform recursive calculations and avoid circular dependencies */
    calculateProps?: typeof calculateProps;
};
export declare function resolveValue(value: StyleDescriptor, get: Getter, options: ResolveValueOptions): any;
//# sourceMappingURL=resolve.d.ts.map