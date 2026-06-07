/** @typedef {import("./types.js").ColorSpace} ColorSpace */
/** @typedef {import("./types.js").Coords} Coords */
/** @typedef {import("./types.js").Format} FormatInterface */
/**
 * @internal
 * Used to index {@link FormatInterface Format} objects and store an instance.
 * Not meant for external use
 */
export const instance: unique symbol;
/**
 * Remove the first element of an array type
 * @template {any[]} T
 * @typedef {T extends [any, ...infer R] ? R : T[number][]} RemoveFirstElement
*/
/**
 * @class Format
 * @implements {Omit<FormatInterface, "coords" | "serializeCoords">}
 * Class to hold a color serialization format
 */
export default class Format implements Omit<FormatInterface, "coords" | "serializeCoords"> {
    /**
     * @param {Format | FormatInterface} format
     * @param {RemoveFirstElement<ConstructorParameters<typeof Format>>} args
     * @returns {Format}
     */
    static get(format: Format | FormatInterface, space?: import("./ColorSpace.js").default): Format;
    /**
     * @param {FormatInterface} format
     * @param {ColorSpace} space
     */
    constructor(format: FormatInterface, space?: ColorSpace);
    type: string;
    name: string;
    spaceCoords: import("./ColorSpace.js").CoordMeta[];
    /** @type {Type[][]} */
    coords: Type[][];
    space: import("./ColorSpace.js").default;
    /**
     * @param {Coords} coords
     * @param {number} precision
     * @param {Type[]} types
     */
    serializeCoords(coords: import("./color.js").Coords, precision: number, types: Type[]): string[];
    /**
     * Validates the coordinates of a color against a format's coord grammar and
     * maps the coordinates to the range or refRange of the coordinates.
     * @param {Coords} coords
     * @param {[string, string, string]} types
     */
    coerceCoords(coords: import("./color.js").Coords, types: [string, string, string]): number[];
    /**
     * @returns {boolean | Required<FormatInterface>["serialize"]}
     */
    canSerialize(): boolean | Required<FormatInterface>["serialize"];
}
export type ColorSpace = import("./types.js").ColorSpace;
export type Coords = import("./types.js").Coords;
export type FormatInterface = import("./types.js").Format;
/**
 * Remove the first element of an array type
 */
export type RemoveFirstElement<T extends any[]> = T extends [any, ...infer R] ? R : T[number][];
import Type from "./Type.js";
//# sourceMappingURL=Format.d.ts.map