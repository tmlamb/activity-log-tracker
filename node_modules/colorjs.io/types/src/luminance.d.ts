/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/**
 *
 * @param {ColorTypes} color
 * @returns {number}
 */
export function getLuminance(color: ColorTypes): number;
/**
 * @param {ColorTypes} color
 * @param {number | ((coord: number) => number)} value
 */
export function setLuminance(color: ColorTypes, value: number | ((coord: number) => number)): void;
/**
 * @param {typeof import("./color.js").default} Color
 */
export function register(Color: typeof import("./color.js").default): void;
export type ColorTypes = import("./types.js").ColorTypes;
//# sourceMappingURL=luminance.d.ts.map