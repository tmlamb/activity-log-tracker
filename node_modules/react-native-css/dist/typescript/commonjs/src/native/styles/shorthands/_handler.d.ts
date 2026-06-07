import type { StyleResolver } from "../resolve";
type ShorthandType = "string" | "number" | "length" | "color" | Readonly<(string | Function)[]>;
type ShorthandRequiredValue = readonly [string | readonly string[], ShorthandType] | ShorthandDefaultValue;
type ShorthandDefaultValue = readonly [
    string | readonly string[],
    ShorthandType,
    any
];
export declare function shorthandHandler(mappings: ShorthandRequiredValue[][], defaults: ShorthandDefaultValue[], returnType?: "shorthandObject" | "tuples" | "object"): StyleResolver;
export {};
//# sourceMappingURL=_handler.d.ts.map