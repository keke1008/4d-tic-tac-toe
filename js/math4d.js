/**
 * 4D Mathematics utilities for rotation and projection
 */

import { CONFIG } from './config.js';

/**
 * Rotate a 4D point through various rotation planes
 * @param {Array<number>} point - [x, y, z, w]
 * @param {Object} rotations - Rotation angles for each plane
 * @returns {Array<number>} Rotated [x, y, z, w]
 */
export function rotate4D(point, rotations) {
    let [x, y, z, w] = point;

    // XY plane rotation
    if (rotations.xy) {
        const cos = Math.cos(rotations.xy);
        const sin = Math.sin(rotations.xy);
        [x, y] = [x * cos - y * sin, x * sin + y * cos];
    }

    // XZ plane rotation
    if (rotations.xz) {
        const cos = Math.cos(rotations.xz);
        const sin = Math.sin(rotations.xz);
        [x, z] = [x * cos - z * sin, x * sin + z * cos];
    }

    // XW plane rotation (4D!)
    if (rotations.xw) {
        const cos = Math.cos(rotations.xw);
        const sin = Math.sin(rotations.xw);
        [x, w] = [x * cos - w * sin, x * sin + w * cos];
    }

    // YZ plane rotation
    if (rotations.yz) {
        const cos = Math.cos(rotations.yz);
        const sin = Math.sin(rotations.yz);
        [y, z] = [y * cos - z * sin, y * sin + z * cos];
    }

    // YW plane rotation (4D!)
    if (rotations.yw) {
        const cos = Math.cos(rotations.yw);
        const sin = Math.sin(rotations.yw);
        [y, w] = [y * cos - w * sin, y * sin + w * cos];
    }

    // ZW plane rotation (4D!)
    if (rotations.zw) {
        const cos = Math.cos(rotations.zw);
        const sin = Math.sin(rotations.zw);
        [z, w] = [z * cos - w * sin, z * sin + w * cos];
    }

    return [x, y, z, w];
}

/**
 * Project 4D point to 3D using perspective projection
 * @param {Array<number>} point - [x, y, z, w]
 * @returns {Array<number>} [x3d, y3d, z3d, w]
 */
export function project4Dto3D(point) {
    const distance = CONFIG.PROJECTION_DISTANCE_4D;
    const [x, y, z, w] = point;
    const factor = distance / (distance - w);
    return [x * factor, y * factor, z * factor, w];
}

/**
 * Calculate W-factor for color and scale calculations
 * @param {number} w - W coordinate
 * @returns {number} Normalized factor (0-1)
 */
export function getWFactor(w) {
    return (w + 2) / 4;
}

/**
 * Calculate hue based on W coordinate
 * @param {number} w - W coordinate
 * @returns {number} Hue value (0-1)
 */
export function getHueFromW(w) {
    const wFactor = getWFactor(w);
    return (wFactor * CONFIG.HUE_RANGE + CONFIG.HUE_OFFSET) % 1;
}

/**
 * Calculate scale based on W coordinate for perspective effect
 * @param {number} w - W coordinate
 * @returns {number} Scale factor
 */
export function getScaleFromW(w) {
    const wFactor = getWFactor(w);
    return CONFIG.CELL_SCALE_MIN + wFactor * CONFIG.CELL_SCALE_RANGE;
}

/**
 * Calculate opacity based on W coordinate
 * @param {number} w - W coordinate
 * @returns {number} Opacity (0-1)
 */
export function getOpacityFromW(w) {
    const wFactor = getWFactor(w);
    return CONFIG.CELL_OPACITY_MIN + wFactor * CONFIG.CELL_OPACITY_RANGE;
}
