/** @typedef {import("./types.js").Algorithms} Algorithms */
/** @typedef {import("./types.js").ColorTypes} ColorTypes */
/**
 *
 * @param {ColorTypes} background
 * @param {ColorTypes} foreground
 * @param {Algorithms | ({ algorithm: Algorithms } & Record<string, any>)} o
 * Algorithm to use as well as any other options to pass to the contrast function
 * @returns {number}
 * @throws {TypeError} Unknown or unspecified algorithm
 */
export default function contrast(background: ColorTypes, foreground: ColorTypes, o: Algorithms | ({
    algorithm: Algorithms;
} & Record<string, any>)): number;
export type Algorithms = import("./types.js").Algorithms;
export type ColorTypes = import("./types.js").ColorTypes;
//# sourceMappingURL=contrast.d.ts.map