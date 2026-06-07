import { type ComponentType } from "react";
import type { StyledConfiguration } from "../../runtime.types";
import { type RenderGuard } from "../conditions/guards";
import { type ContainerContextValue, type Effect, type Getter, type VariableContextValue } from "../reactivity";
import { stylesFamily } from "../styles";
export type Config = {
    source: string;
    target: string[] | string | false;
    nativeStyleMapping?: Record<string, string>;
};
export type ComponentState = {
    /** The source/target for classNames */
    configs: Config[];
    /** Reactive tracking */
    ruleEffect: Effect;
    ruleEffectGetter: Getter;
    styleEffect: Effect;
    /** The components props */
    currentProps?: Record<string, any> | undefined | null;
    /** An observable of the normal/important props */
    stylesObs?: ReturnType<typeof stylesFamily>;
    guards?: RenderGuard[];
    variables?: VariableContextValue;
    containers?: ContainerContextValue;
    inheritedVariables: VariableContextValue;
    inheritedContainers: ContainerContextValue;
    animated?: boolean;
    pressable?: undefined | boolean;
};
/**
 * useNativeCss is the native implementation of the useCssElement hook.
 */
export declare function useNativeCss(type: ComponentType<any>, originalProps: Record<string, any> | undefined | null, configs?: Config[]): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | import("react").FunctionComponentElement<import("react").FragmentProps>;
/**
 * Convert the styled() mapping to a config array
 */
export declare function mappingToConfig(mapping: StyledConfiguration<any>): Config[];
//# sourceMappingURL=useNativeCss.d.ts.map