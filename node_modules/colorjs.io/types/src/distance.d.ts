/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/**
 * Euclidean distance of colors in an arbitrary color space
 * @param {ColorTypes} color1
 * @param {ColorTypes} color2
 * @param {string | ColorSpace} space
 * @returns {number}
 */
export default function distance(color1: ColorTypes, color2: ColorTypes, space?: string | ColorSpace): number;
export type ColorTypes = import("./types.js").ColorTypes;
import ColorSpace from "./ColorSpace.js";
//# sourceMappingURL=distance.d.ts.map