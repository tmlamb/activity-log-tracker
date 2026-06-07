import type { Angle, BorderSideWidth, BorderStyle, ColorOrAuto, CssColor, Declaration, DimensionPercentageFor_LengthValue, EnvironmentVariable, FontSize, FontStyle, FontVariantCaps, FontWeight, Length, LengthPercentageOrAuto, LengthValue, LineHeight, LineStyle, MaxSize, NumberOrPercentage, Scale, Size, Size2DFor_DimensionPercentageFor_LengthValue, Time, Token, TokenOrValue, Translate, UnresolvedColor } from "lightningcss";
import type { StyleDescriptor, StyleFunction } from "./compiler.types";
import type { StylesheetBuilder } from "./stylesheet";
type DeclarationType<P extends Declaration["property"]> = Extract<Declaration, {
    property: P;
}>;
export declare function parseDeclaration(declaration: Declaration, builder: StylesheetBuilder): void;
export declare function parseBorderInlineWidth(declaration: DeclarationType<"border-inline-width">, builder: StylesheetBuilder): void;
export declare function parseBorderInlineStyle(declaration: DeclarationType<"border-inline-style" | "border-inline-start-style" | "border-inline-end-style">, builder: StylesheetBuilder): void;
export declare function parseScaleValue(translate: Scale, prop: keyof Extract<Scale, object>, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseUnparsedDeclaration(declaration: Extract<Declaration, {
    property: "unparsed";
}>, builder: StylesheetBuilder): void;
export declare function parseCustomDeclaration(declaration: Extract<Declaration, {
    property: "custom";
}>, builder: StylesheetBuilder): void;
export declare function reduceParseUnparsed(tokenOrValues: TokenOrValue[], builder: StylesheetBuilder, property: string, allowAuto: boolean): StyleDescriptor;
export declare function unparsedFunction(token: Extract<TokenOrValue, {
    type: "function";
}>, builder: StylesheetBuilder, property: string, allowAuto: boolean): StyleFunction;
/**
 * When the CSS cannot be parsed (often due to a runtime condition like a CSS variable)
 * This export function best efforts parsing it into a export function that we can evaluate at runtime
 */
export declare function parseUnparsed(tokenOrValue: TokenOrValue | TokenOrValue[] | string | number | undefined | null, builder: StylesheetBuilder, property: string, allowAuto?: boolean): StyleDescriptor;
export declare function parseLengthDeclaration(declaration: {
    value: number | Length | DimensionPercentageFor_LengthValue | NumberOrPercentage | LengthValue;
}, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseLength(length: number | Length | DimensionPercentageFor_LengthValue | NumberOrPercentage | LengthValue, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseAngle(angle: Angle | number, builder: StylesheetBuilder): string | undefined;
export declare function parseSizeDeclaration(declaration: {
    value: Size | MaxSize;
}, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseSizeWithAutoDeclaration(declaration: {
    value: Size | MaxSize;
}, builder: StylesheetBuilder): StyleDescriptor;
export declare function parsePointerEvents({ value }: {
    value: string;
}, builder: StylesheetBuilder): "auto" | "none" | "box-none" | "box-only" | undefined;
export declare function parseSize(size: Size | MaxSize, builder: StylesheetBuilder, options?: {
    allowAuto?: boolean;
}): StyleDescriptor;
export declare function parseSize(size: Size | MaxSize, builder: StylesheetBuilder, property: string, options?: {
    allowAuto?: boolean;
}): StyleDescriptor;
export declare function parseColorOrAutoDeclaration({ value }: {
    value: ColorOrAuto;
}, builder: StylesheetBuilder): string | readonly [{}, "var", "__rn-css-color"] | undefined;
export declare function parseFontColorDeclaration(declaration: Extract<Declaration, {
    value: CssColor;
}>, builder: StylesheetBuilder): void;
export declare function parseColorDeclaration(declaration: Extract<Declaration, {
    value: CssColor;
}>, builder: StylesheetBuilder): void;
export declare function parseColor(cssColor: CssColor, builder: StylesheetBuilder): string | readonly [{}, "var", "__rn-css-color"] | undefined;
export declare function parseLengthPercentageDeclaration(value: {
    value: LengthPercentageOrAuto;
}, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseLengthPercentageOrAutoDeclaration(value: {
    value: LengthPercentageOrAuto;
}, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseLengthPercentageOrAuto(lengthPercentageOrAuto: LengthPercentageOrAuto, builder: StylesheetBuilder, { allowAuto }?: {
    allowAuto?: boolean | undefined;
}): StyleDescriptor;
export declare function parseJustifyContent(declaration: DeclarationType<"justify-content">, builder: StylesheetBuilder): string | undefined;
export declare function parseAlignContent(declaration: DeclarationType<"align-content">, builder: StylesheetBuilder): string | undefined;
export declare function parseAlignItems(alignItems: DeclarationType<"align-items">, builder: StylesheetBuilder): string | undefined;
export declare function parseAlignSelf(alignSelf: DeclarationType<"align-self">, builder: StylesheetBuilder): string | undefined;
export declare function parseFontWeightDeclaration(declaration: DeclarationType<"font-weight">, builder: StylesheetBuilder): number | "bold" | "normal" | undefined;
export declare function parseFontWeight(fontWeight: FontWeight, builder: StylesheetBuilder): number | "bold" | "normal" | undefined;
export declare function parseTextShadow(declaration: DeclarationType<"text-shadow">, builder: StylesheetBuilder): void;
export declare function parseTextDecorationStyle(declaration: DeclarationType<"text-decoration-style">, builder: StylesheetBuilder): import("lightningcss").TextDecorationStyle | undefined;
export declare function parseTextDecorationLineDeclaration(declaration: DeclarationType<"text-decoration-line">, builder: StylesheetBuilder): "none" | "underline" | "line-through" | "underline line-through" | undefined;
export declare function parseTextDecorationLine(value: DeclarationType<"text-decoration-line">["value"], builder: StylesheetBuilder): "none" | "underline" | "line-through" | "underline line-through" | undefined;
export declare function parsePosition({ value }: DeclarationType<"position">, builder: StylesheetBuilder): "static" | "absolute" | "relative" | undefined;
export declare function parseOverflow({ value }: DeclarationType<"overflow">, builder: StylesheetBuilder): import("lightningcss").OverflowKeyword | undefined;
export declare function parseBorderStyleDeclaration(declaration: Extract<DeclarationType<Declaration["property"]>, {
    value: LineStyle | BorderStyle;
}>, builder: StylesheetBuilder): LineStyle | undefined;
export declare function parseBorderStyle(value: BorderStyle | LineStyle, builder: StylesheetBuilder): LineStyle | undefined;
export declare function parseBorderBlockWidth(declaration: DeclarationType<"border-block-width">, builder: StylesheetBuilder): void;
export declare function parseBorderSideWidthDeclaration(declaration: Extract<Declaration, {
    value: BorderSideWidth;
}>, builder: StylesheetBuilder): void;
export declare function parseBorderSideWidth(value: BorderSideWidth, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseVerticalAlign({ value }: DeclarationType<"vertical-align">, builder: StylesheetBuilder): import("lightningcss").VerticalAlignKeyword | undefined;
export declare function parseLineHeightDeclaration(declaration: DeclarationType<"line-height">, builder: StylesheetBuilder): void;
export declare function parseLineHeight(value: LineHeight, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseFontSizeDeclaration(declaration: DeclarationType<"font-size">, builder: StylesheetBuilder): void;
export declare function parseFontSize(value: FontSize, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseFontStyleDeclaration(declaration: DeclarationType<"font-style">, builder: StylesheetBuilder): "normal" | "italic" | undefined;
export declare function parseFontStyle(value: FontStyle, builder: StylesheetBuilder): "normal" | "italic" | undefined;
export declare function parseFontVariantCapsDeclaration(declaration: DeclarationType<"font-variant-caps">, builder: StylesheetBuilder): FontVariantCaps | undefined;
export declare function parseFontVariantCaps(value: FontVariantCaps, builder: StylesheetBuilder): FontVariantCaps | undefined;
export declare function parseLengthOrCoercePercentageToRuntime(value: Length | DimensionPercentageFor_LengthValue | NumberOrPercentage, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseGap(declaration: DeclarationType<"gap" | "column-gap" | "row-gap">, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseTextAlign({ value }: DeclarationType<"text-align">, builder: StylesheetBuilder): import("lightningcss").TextAlign | undefined;
export declare function parseBoxShadow({ value }: DeclarationType<"box-shadow">, builder: StylesheetBuilder): void;
export declare function parseBoxSizing(declaration: DeclarationType<"box-sizing">, builder: StylesheetBuilder): import("lightningcss").BoxSizing | undefined;
export declare function parseDisplay({ value }: DeclarationType<"display">, builder: StylesheetBuilder): "none" | "flex" | "contents" | undefined;
export declare function parseDirection(declaration: DeclarationType<"direction">, builder: StylesheetBuilder): void;
export declare function parseAspectRatio({ value, }: DeclarationType<"aspect-ratio">): StyleDescriptor;
export declare function parseBackfaceVisibility({ value }: DeclarationType<"backface-visibility">, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseDimension({ unit, value }: Extract<Token, {
    type: "dimension";
}>, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseUserSelect({ value }: DeclarationType<"user-select">, builder: StylesheetBuilder): import("lightningcss").UserSelect | undefined;
export declare function parseSVGPaint({ value, property }: DeclarationType<"fill" | "stroke">, builder: StylesheetBuilder): void;
export declare function round(number: number): number;
export declare function parseDimensionPercentageFor_LengthValue(value: DimensionPercentageFor_LengthValue, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseEnv(value: EnvironmentVariable, builder: StylesheetBuilder): StyleFunction | undefined;
export declare function parseCalcFn(name: string, tokens: TokenOrValue[], builder: StylesheetBuilder, property: string): StyleDescriptor;
export declare function parseColorMix(tokens: TokenOrValue[], builder: StylesheetBuilder, property: string): StyleDescriptor;
export declare function parseCalcArguments([...args]: TokenOrValue[], builder: StylesheetBuilder, property: string): StyleDescriptor[] | undefined;
export declare function parseTranslateProp(value: Translate, prop: keyof Extract<Translate, object>, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseUnresolvedColor(color: UnresolvedColor, builder: StylesheetBuilder, property: string, allowAuto: boolean): StyleDescriptor;
export declare function allEqual(...params: unknown[]): boolean;
export declare function equal(a: unknown, b: unknown): boolean;
export declare function parseTime(time: Time): number;
export declare function parseSize2DDimensionPercentageDeclaration(declaration: {
    value: Size2DFor_DimensionPercentageFor_LengthValue;
}, builder: StylesheetBuilder): StyleDescriptor;
export declare function parseSize2DDimensionPercentage(value: Size2DFor_DimensionPercentageFor_LengthValue, builder: StylesheetBuilder): StyleDescriptor;
export declare function addTransitionValue(declaration: Extract<Declaration, {
    property: `transition${string}` | "transition";
}>, builder: StylesheetBuilder): void;
export declare function addAnimationValue(declaration: Extract<Declaration, {
    property: `animation${string}` | "animation";
}>, builder: StylesheetBuilder): void;
export declare function kebabCase(str: string): string;
export {};
//# sourceMappingURL=declarations.d.ts.map