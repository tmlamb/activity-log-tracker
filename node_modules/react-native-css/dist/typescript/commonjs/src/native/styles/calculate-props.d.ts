import type { InlineVariable, StyleDeclaration, StyleRule } from "react-native-css/compiler";
import type { RenderGuard } from "../conditions/guards";
import { type Getter, type VariableContextValue } from "../reactivity";
export declare function calculateProps(get: Getter, rules: (StyleRule | InlineVariable | VariableContextValue)[], guards?: RenderGuard[], inheritedVariables?: VariableContextValue, inlineVariables?: InlineVariable): {
    normal: Record<string, any> | undefined;
    guards: RenderGuard[];
    important: Record<string, any> | undefined;
};
export declare function applyDeclarations(get: Getter, declarations: StyleDeclaration[], inlineVariables: InlineVariable, inheritedVariables: VariableContextValue, delayedStyles?: (() => void)[], transformStyles?: (() => void)[], guards?: RenderGuard[], target?: Record<string, any>, topLevelTarget?: Record<string, any>): void;
//# sourceMappingURL=calculate-props.d.ts.map