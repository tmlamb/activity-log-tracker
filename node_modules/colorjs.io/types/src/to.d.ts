/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/** @typedef {import("./types.js").PlainColorObject} PlainColorObject */
/** @typedef {import("./types.js").ToGamutOptions} ToGamutOptions */
/**
 * Convert to color space and return a new color
 * @param {ColorTypes} color
 * @param {string | ColorSpace} space
 * @param {{ inGamut?: boolean | ToGamutOptions | undefined }} options
 * @returns {PlainColorObject}
 */
declare function to(color: ColorTypes, space: string | ColorSpace, { inGamut }?: {
    inGamut?: boolean | ToGamutOptions | undefined;
}): PlainColorObject;
declare namespace to {
    let returns: "color";
}
export default to;
export type ColorTypes = import("./types.js").ColorTypes;
export type PlainColorObject = import("./types.js").PlainColorObject;
export type ToGamutOptions = import("./types.js").ToGamutOptions;
import ColorSpace from "./ColorSpace.js";
//# sourceMappingURL=to.d.ts.map