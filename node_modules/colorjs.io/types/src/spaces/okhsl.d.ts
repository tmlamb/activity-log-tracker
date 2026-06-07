/**
 * Toe function for L_r
 * @param {number} x
 */
export function toe(x: number): number;
/**
 * Inverse toe function for L_r
 * @param {number} x
 */
export function toeInv(x: number): number;
/**
 * @param {readonly [number, number]} cusp
 * @returns {[number, number]}
 */
export function toSt(cusp: readonly [number, number]): [number, number];
/**
 * @param {Vector3} lab
 * @param {Matrix3x3} lmsToRgb
 */
export function oklabToLinearRGB(lab: import("../types.js").Vector3, lmsToRgb: import("../types.js").Matrix3x3): import("../types.js").Vector3;
/**
 * @param {number} a
 * @param {number} b
 * @param {Matrix3x3} lmsToRgb
 * @param {OKCoeff} okCoeff
 * @returns {[number, number]}
 * @todo Could probably make these types more specific/better-documented if desired
 */
export function findCusp(a: number, b: number, lmsToRgb: import("../types.js").Matrix3x3, okCoeff: import("../types.js").OKCoeff): [number, number];
/**
 * @param {number} a
 * @param {number} b
 * @param {number} l1
 * @param {number} c1
 * @param {number} l0
 * @param {Matrix3x3} lmsToRgb
 * @param {OKCoeff} okCoeff
 * @param {[number, number]} cusp
 * @returns {Number}
 * @todo Could probably make these types more specific/better-documented if desired
 */
export function findGamutIntersection(a: number, b: number, l1: number, c1: number, l0: number, lmsToRgb: import("../types.js").Matrix3x3, okCoeff: import("../types.js").OKCoeff, cusp: [number, number]): number;
/** @typedef {import("../types.js").Matrix3x3} Matrix3x3 */
/** @typedef {import("../types.js").Vector3} Vector3 */
/** @typedef {import("../types.js").OKCoeff} OKCoeff */
export const tau: number;
/** @type {Matrix3x3} */
export const toLMS: import("../types.js").Matrix3x3;
/** @type {Matrix3x3} */
export const toSRGBLinear: import("../types.js").Matrix3x3;
/** @type {OKCoeff} */
export const RGBCoeff: import("../types.js").OKCoeff;
declare const _default: ColorSpace;
export default _default;
export type Matrix3x3 = import("../types.js").Matrix3x3;
export type Vector3 = import("../types.js").Vector3;
export type OKCoeff = import("../types.js").OKCoeff;
import ColorSpace from "../ColorSpace.js";
//# sourceMappingURL=okhsl.d.ts.map