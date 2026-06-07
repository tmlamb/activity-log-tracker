import type { SelectorList } from "lightningcss";
import type { AnimationKeyframes, AnimationRecord, CompilerOptions, ContainerQuery, MediaCondition, ReactNativeCssStyleSheet, StyleDeclaration, StyleDescriptor, StyleRule, StyleRuleMapping, StyleRuleSet, VariableRecord } from "./compiler.types";
type BuilderMode = "style" | "media" | "container" | "keyframes";
export declare class StylesheetBuilder {
    private options;
    mode: BuilderMode;
    private ruleTemplate;
    private mapping;
    descriptorProperty?: string | undefined;
    private shared;
    private selectors;
    animationFrames?: AnimationKeyframes[];
    animationDeclarations: StyleDeclaration[];
    stylesheet: ReactNativeCssStyleSheet;
    varUsage: Set<string>;
    private rule;
    constructor(options: CompilerOptions, mode?: BuilderMode, ruleTemplate?: StyleRule, mapping?: StyleRuleMapping, descriptorProperty?: string | undefined, shared?: {
        ruleSets: Record<string, StyleRuleSet>;
        rootVariables?: VariableRecord;
        universalVariables?: VariableRecord;
        animations?: AnimationRecord;
        rem: number;
        ruleOrder: number;
        warningProperty?: string;
        warningProperties: string[];
        warningValues: Record<string, unknown[]>;
        warningFunctions: string[];
    }, selectors?: SelectorList);
    fork(mode?: BuilderMode, selectors?: SelectorList): StylesheetBuilder;
    cloneRule({ ...rule }?: StyleRule): StyleRule;
    private createRuleFromPartial;
    extendRule(rule: Partial<StyleRule>): StyleRule;
    getOptions(): CompilerOptions;
    setOptions<T extends keyof CompilerOptions>(key: T, value: CompilerOptions[T]): void;
    getNativeStyleSheet(): ReactNativeCssStyleSheet;
    getRuleSets(): (readonly [string, StyleRuleSet])[] | undefined;
    setWarningProperty(property: string): void;
    addWarning(type: "property" | "value", property: string): void;
    addWarning(type: "style", property: string, value: unknown): void;
    getWarnings(): {
        properties?: string[];
        values?: Record<string, unknown[]>;
        functions?: string[];
    };
    addMapping(mapping: StyleRuleMapping): void;
    newRule(mapping?: StyleRuleMapping, { important }?: {
        important?: boolean | undefined;
    }): void;
    /** Used by nested declarations (for example @media inside a RuleSet) */
    newNestedRule({ important, mapping }?: {
        important?: boolean | undefined;
        mapping?: StyleRuleMapping | undefined;
    }): void;
    /** Hack for light-dark, which requires adding a new rule without changing the current rule */
    addExtraRule(rule: Partial<StyleRule>): void;
    private addRuleToRuleSet;
    addMediaQuery(condition: MediaCondition): void;
    addContainer(value: string[] | false): void;
    addUnnamedDescriptor(value: StyleDescriptor, forceTuple?: boolean, rule?: StyleRule): void;
    addDescriptor(property: string, value: StyleDescriptor, forceTuple?: boolean, rule?: StyleRule): void;
    addShorthand(property: string, options: Record<string, StyleDescriptor>): void;
    private pushDescriptor;
    applyRuleToSelectors(selectorList?: SelectorList): void;
    addContainerQuery(query: ContainerQuery): void;
    addRootVariable(name: string, value: StyleDescriptor): void;
    newAnimationFrames(name: string): void;
    newAnimationFrame(progress: string): void;
}
export {};
//# sourceMappingURL=stylesheet.d.ts.map