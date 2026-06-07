/**
 * Resolves a color reference (object or string) to a plain color object
 * @overload
 * @param {ColorTypes} color
 * @param {object} [options]
 * @param {boolean} [options.parseMeta] Optional object to hold parsing metadata
 * @returns {PlainColorObject}
 */
export default function getColor(color: ColorTypes, options?: {
    parseMeta?: boolean;
}): PlainColorObject;
/**
 * @overload
 * @param {ColorTypes[]} color
 * @param {object} [options]
 * @param {boolean} [options.parseMeta] Optional object to hold parsing metadata
 * @returns {PlainColorObject[]}
 */
export default function getColor(color: ColorTypes[], options?: {
    parseMeta?: boolean;
}): PlainColorObject[];
export type ColorTypes = import("./types.js").ColorTypes;
export type PlainColorObject = import("./types.js").PlainColorObject;
//# sourceMappingURL=getColor.d.ts.map