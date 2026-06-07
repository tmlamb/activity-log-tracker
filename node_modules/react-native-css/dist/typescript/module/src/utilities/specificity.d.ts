import type { SpecificityArray, StyleRule } from "../compiler";
import type { InlineStyleRecord } from "../runtime.types";
export declare const Specificity: {
    Order: number;
    ClassName: number;
    Important: number;
    Inline: number;
    PseudoElements: number;
    PseudoClass: number;
};
export declare const inlineSpecificity: SpecificityArray;
export declare const specificityCompareFn: (a: StyleRule | InlineStyleRecord, b: StyleRule | InlineStyleRecord) => number;
//# sourceMappingURL=specificity.d.ts.map