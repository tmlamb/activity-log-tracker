import type { InlineVariable, StyleRule } from "react-native-css/compiler";
import type { ComponentState } from "../react/useNativeCss";
import { type Effect, type VariableContextValue } from "../reactivity";
export declare const stylesFamily: ((key: string, args: Set<VariableContextValue | StyleRule | InlineVariable>) => import("../reactivity").Observable<{
    normal: Record<string, any> | undefined;
    guards: import("../conditions/guards").RenderGuard[];
    important: Record<string, any> | undefined;
}, {
    normal: Record<string, any> | undefined;
    guards: import("../conditions/guards").RenderGuard[];
    important: Record<string, any> | undefined;
}> & {
    cleanup: (effect: Effect) => void;
}) & {
    delete(key: string): boolean;
    clear(): void;
};
export declare function getStyledProps(state: ComponentState, inline: Record<string, any> | undefined | null): Record<string, any> | undefined;
//# sourceMappingURL=index.d.ts.map