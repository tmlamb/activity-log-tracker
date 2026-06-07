/**
 * Set all coordinates of a color at once, in its own color space or another.
 * Modifies the color in place.
 * @overload
 * @param {ColorTypes} color
 * @param {Coords} coords Array of coordinates
 * @param {number} [alpha]
 * @returns {PlainColorObject}
 */
declare function setAll(color: ColorTypes, coords: import("./color.js").Coords, alpha?: number): PlainColorObject;
/**
 * @overload
 * @param {ColorTypes} color
 * @param {string | ColorSpace} space The color space of the provided coordinates.
 * @param {Coords} coords Array of coordinates
 * @param {number} [alpha]
 * @returns {PlainColorObject}
 */
declare function setAll(color: ColorTypes, space: string | ColorSpace, coords: import("./color.js").Coords, alpha?: number): PlainColorObject;
declare namespace setAll {
    let returns: "color";
}
export default setAll;
export type ColorTypes = import("./types.js").ColorTypes;
export type Coords = import("./types.js").Coords;
export type PlainColorObject = import("./types.js").PlainColorObject;
import ColorSpace from "./ColorSpace.js";
//# sourceMappingURL=setAll.d.ts.map