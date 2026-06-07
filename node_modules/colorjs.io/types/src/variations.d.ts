/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/** @typedef {import("./types.js").PlainColorObject} PlainColorObject */
/** @typedef {import("./types.js").Ref} Ref */
/**
 * @param {ColorTypes} color
 * @param {number} amount
 * @returns {PlainColorObject}
 */
export function lighten(color: ColorTypes, amount?: number): PlainColorObject;
/**
 * @param {ColorTypes} color
 * @param {number} amount
 * @returns {PlainColorObject}
 */
export function darken(color: ColorTypes, amount?: number): PlainColorObject;
export type ColorTypes = import("./types.js").ColorTypes;
export type PlainColorObject = import("./types.js").PlainColorObject;
export type Ref = import("./types.js").Ref;
//# sourceMappingURL=variations.d.ts.map