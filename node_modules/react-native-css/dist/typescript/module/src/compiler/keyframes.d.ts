import type { AnimationIterationCount, EasingFunction as CSSEasingFunction, KeyframesRule } from "lightningcss";
import type { StyleDescriptor } from "./compiler.types";
import type { StylesheetBuilder } from "./stylesheet";
export declare function parseIterationCount(value: AnimationIterationCount[]): (number | "infinite")[];
export declare function parseEasingFunction(value: CSSEasingFunction[]): StyleDescriptor;
export declare function extractKeyFrames(keyframes: KeyframesRule, builder: StylesheetBuilder): void;
//# sourceMappingURL=keyframes.d.ts.map