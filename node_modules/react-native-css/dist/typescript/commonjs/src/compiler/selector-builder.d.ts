import type { SelectorList } from "lightningcss";
import type { AttributeQuery, CompilerOptions, ContainerQuery, MediaCondition, PseudoClassesQuery, SpecificityArray } from "./compiler.types";
interface ReactNativeClassNameSelector {
    type: "className";
    specificity: SpecificityArray;
    className: string;
    mediaQuery?: MediaCondition[];
    containerQuery?: ContainerQuery[];
    pseudoClassesQuery?: PseudoClassesQuery;
    attributeQuery?: AttributeQuery[];
    pseudoElementQuery?: string[];
}
interface ReactNativeGlobalSelector {
    type: "rootVariables" | "universalVariables";
}
type PartialSelector = Partial<ReactNativeClassNameSelector> & {
    type: "className";
    specificity: SpecificityArray;
};
export declare function getClassNameSelectors(selectors: SelectorList, options?: CompilerOptions): (ReactNativeGlobalSelector | PartialSelector)[];
export declare function toRNProperty<T extends string>(str: T): CamelCase<T>;
type CamelCase<S extends string> = S extends `${infer P1}-${infer P2}${infer P3}` ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}` : Lowercase<S>;
export {};
//# sourceMappingURL=selector-builder.d.ts.map