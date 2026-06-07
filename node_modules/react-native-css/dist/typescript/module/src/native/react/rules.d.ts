import { type ContainerContextValue, type VariableContextValue } from "../reactivity";
import type { ComponentState } from "./useNativeCss";
export declare const INLINE_RULE_SYMBOL: unique symbol;
export declare function updateRules(state: ComponentState, currentProps?: Record<string, any> | null | undefined, inheritedVariables?: VariableContextValue, inheritedContainers?: ContainerContextValue, forceUpdate?: boolean, isRerender?: boolean): ComponentState;
export declare function generateStateHash(state: ComponentState, iterableKeys?: Iterable<WeakKey>, variables?: WeakKey, inlineVars?: Set<WeakKey>): string;
export declare function generateHash(keys: WeakKey[]): string;
//# sourceMappingURL=rules.d.ts.map