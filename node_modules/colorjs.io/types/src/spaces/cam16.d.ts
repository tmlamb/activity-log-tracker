/**
 * @param {Coords} coords
 * @param {number} fl
 * @returns {[number, number, number]}
 */
export function adapt(coords: import("../color.js").Coords, fl: number): [number, number, number];
/**
 * @param {Coords} adapted
 * @param {number} fl
 * @returns {[number, number, number]}
 */
export function unadapt(adapted: import("../color.js").Coords, fl: number): [number, number, number];
/**
 * @param {number} h
 */
export function hueQuadrature(h: number): number;
/**
 * @param {number} H
 */
export function invHueQuadrature(H: number): number;
/**
 * @param {[number, number, number]} refWhite
 * @param {number} adaptingLuminance
 * @param {number} backgroundLuminance
 * @param {keyof typeof surroundMap} surround
 * @param {boolean} discounting
 */
export function environment(refWhite: [number, number, number], adaptingLuminance: number, backgroundLuminance: number, surround: keyof typeof surroundMap, discounting: boolean): {
    discounting: boolean;
    refWhite: [number, number, number];
    surround: "dark" | "dim" | "average";
    la: number;
    yb: number;
    c: string;
    nc: string;
    fl: number;
    flRoot: number;
    n: number;
    z: number;
    nbb: number;
    ncb: number;
    dRgb: number[];
    dRgbInv: number[];
    aW: number;
};
/** @typedef {{J: number, C: number, h: number, s: number, Q: number, M: number, H: number}} Cam16Object */
/**
 * @param {Cam16Object} cam16
 * @param {Record<string, unknown>} env
 * @returns {[number, number, number]}
 * @todo Add types for `env`
 */
export function fromCam16(cam16: Cam16Object, env: Record<string, unknown>): [number, number, number];
/**
 * @param {[number, number, number]} xyzd65
 * @param {Record<string, unknown>} env
 * @returns {Cam16Object}
 * @todo Add types for `env`
 */
export function toCam16(xyzd65: [number, number, number], env: Record<string, unknown>): Cam16Object;
declare const _default: ColorSpace;
export default _default;
export type Cam16Object = {
    J: number;
    C: number;
    h: number;
    s: number;
    Q: number;
    M: number;
    H: number;
};
export type Coords = import("../types.js").Coords;
export type Matrix3x3 = import("../types.js").Matrix3x3;
export type Vector3 = import("../types.js").Vector3;
declare namespace surroundMap {
    let dark: number[];
    let dim: number[];
    let average: number[];
}
import ColorSpace from "../ColorSpace.js";
//# sourceMappingURL=cam16.d.ts.map