/**
 * Returns a serialization of the color that can actually be displayed in the browser.
 * If the default serialization can be displayed, it is returned.
 * Otherwise, the color is converted to Lab, REC2020, or P3, whichever is the widest supported.
 * In Node.js, this is basically equivalent to `serialize()` but returns a `String` object instead.
 * @param {ColorTypes} color
 * @param {{ space?: string | ColorSpace | undefined } & Record<string, any>} param1
 * Options to be passed to `serialize()`
 * @returns {Display} String object containing the serialized color
 * with a color property containing the converted color (or the original, if no conversion was necessary)
 */
export default function display(color: ColorTypes, { space, ...options }?: {
    space?: string | ColorSpace | undefined;
} & Record<string, any>): Display;
export type ColorTypes = import("./types.js").ColorTypes;
export type PlainColorObject = import("./types.js").PlainColorObject;
export type Display = import("./types.js").Display;
export type ColorSpace = import("./ColorSpace.js").default;
//# sourceMappingURL=display.d.ts.map