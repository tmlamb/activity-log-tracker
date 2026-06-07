/** @typedef {import("./color.js").default} Color */
/** @typedef {import("./color.js").ColorTypes} ColorTypes */
/**
 * @param {ColorTypes} color
 * @returns {[number, number]}
 */
export function uv(color: ColorTypes): [number, number];
/**
 * @param {ColorTypes} color
 * @returns {[number, number]}
 */
export function xy(color: ColorTypes): [number, number];
/**
 * @param {typeof import("./color.js").default} Color
 */
export function register(Color: typeof import("./color.js").default): void;
export type Color = import("./color.js").default;
export type ColorTypes = import("./color.js").ColorTypes;
//# sourceMappingURL=chromaticity.d.ts.map