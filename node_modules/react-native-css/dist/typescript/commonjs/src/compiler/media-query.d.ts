import type { MediaFeatureComparison as CSSMediaFeatureComparison, MediaFeatureValue as CSSMediaFeatureValue, MediaQuery as CSSMediaQuery } from "lightningcss";
import type { MediaFeatureComparison, StyleDescriptor } from "./compiler.types";
import type { StylesheetBuilder } from "./stylesheet";
export declare function parseMediaQuery(query: CSSMediaQuery, builder: StylesheetBuilder): void;
export declare function parseMediaFeatureValue(value: CSSMediaFeatureValue, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseMediaFeatureOperator(operator: CSSMediaFeatureComparison): MediaFeatureComparison;
//# sourceMappingURL=media-query.d.ts.map