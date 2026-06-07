import type { ComponentState } from "../react/useNativeCss";
import type { ContainerContextValue, VariableContextValue } from "../reactivity";
export type RenderGuard = ["a", string, any] | ["d", string, any] | ["v", string, any] | ["c", string, WeakKey];
export declare function testGuards(state: ComponentState, currentProps: any, inheritedVariables: VariableContextValue, inheritedContainers: ContainerContextValue): boolean | undefined;
//# sourceMappingURL=guards.d.ts.map