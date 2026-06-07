/**
 * Get the coordinates of a color in any color space
 * @overload
 * @param {ColorTypes} color
 * @param {string | ColorSpace} [options=color.space] The color space to convert to. Defaults to the color's current space
 * @returns {Coords} The color coordinates in the given color space
 */
export default function getAll(color: ColorTypes, options?: string | ColorSpace): import("./color.js").Coords;
/**
 * @overload
 * @param {ColorTypes} color
 * @param {GetAllOptions} [options]
 * @returns {Coords} The color coordinates in the given color space
 */
export default function getAll(color: ColorTypes, options?: GetAllOptions): import("./color.js").Coords;
export type ColorTypes = import("./types.js").ColorTypes;
export type Coords = import("./types.js").Coords;
/**
 * Options for {@link getAll }
 */
export type GetAllOptions = {
    /**
     * The color space to convert to. Defaults to the color's current space
     */
    space?: string | ColorSpace | undefined;
    /**
     * The number of significant digits to round the coordinates to
     */
    precision?: number | undefined;
};
import ColorSpace from "./ColorSpace.js";
//# sourceMappingURL=getAll.d.ts.map