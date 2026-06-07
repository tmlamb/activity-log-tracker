import type { SelectorList } from "lightningcss";
import type { AttributeQuery, ContainerQuery, MediaCondition, PseudoClassesQuery, SpecificityArray } from "./compiler.types";
import { StylesheetBuilder } from "./stylesheet";
export type NormalizeSelector = ClassNameSelector | {
    type: "rootVariables" | "universalVariables";
    subtype: "light" | "dark";
};
type ClassNameSelector = {
    type: "className";
    specificity: SpecificityArray;
    className: string;
    mediaQuery?: MediaCondition[];
    containerQuery?: ContainerQuery[];
    pseudoClassesQuery?: PseudoClassesQuery;
    attributeQuery?: AttributeQuery[];
};
/**
 * Turns a CSS selector into a `react-native-css` selector.
 */
export declare function getSelectors(selectorList: SelectorList, isDarkMode: boolean, builder: StylesheetBuilder, selectors?: NormalizeSelector[]): NormalizeSelector[];
export declare function toRNProperty<T extends string>(str: T): CamelCase<T>;
type CamelCase<S extends string> = S extends `${infer P1}-${infer P2}${infer P3}` ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}` : Lowercase<S>;
export {};
//# sourceMappingURL=selectors.d.ts.map