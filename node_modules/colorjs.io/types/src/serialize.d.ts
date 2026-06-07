/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/** @typedef {import("./types.js").SerializeOptions} SerializeOptions */
/**
 * Generic toString() method, outputs a color(spaceId ...coords) function, a functional syntax, or custom formats defined by the color space
 * @param {ColorTypes} color
 * @param {SerializeOptions & Record<string, any>} options
 * @returns {string}
 */
export default function serialize(color: ColorTypes, options?: SerializeOptions & Record<string, any>): string;
export type ColorTypes = import("./types.js").ColorTypes;
export type SerializeOptions = import("./types.js").SerializeOptions;
//# sourceMappingURL=serialize.d.ts.map