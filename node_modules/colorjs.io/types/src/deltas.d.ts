/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/** @typedef {import("./types.js").DeltasReturn} DeltasReturn */
/**
 * Get color differences per-component, on any color space
 * @param {ColorTypes} c1
 * @param {ColorTypes} c2
 * @param {object} options
 * @param {string | ColorSpace} [options.space=c1.space] - The color space to use for the delta calculation. Defaults to the color space of the first color.
 * @param {Parameters<typeof adjust>[0]} [options.hue="shorter"] - How to handle hue differences. Same as hue interpolation option.
 * @returns {DeltasReturn}
 */
export default function deltas(c1: ColorTypes, c2: ColorTypes, { space, hue }?: {
    space?: string | ColorSpace;
    hue?: [arc: "raw" | "increasing" | "decreasing" | "longer" | "shorter", angles: [number, number]][0];
}): DeltasReturn;
export type ColorTypes = import("./types.js").ColorTypes;
export type DeltasReturn = import("./types.js").DeltasReturn;
import ColorSpace from "./ColorSpace.js";
//# sourceMappingURL=deltas.d.ts.map