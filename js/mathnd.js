/**
 * N-Dimensional Mathematics utilities for rotation and projection
 * Supports 2D, 3D, 4D, and higher dimensions
 */

import { CONFIG } from './config.js';

/**
 * Generate all possible rotation plane pairs for N dimensions
 * @param {number} dimensions - Number of dimensions
 * @returns {Array<Array<number>>} Array of [axis1, axis2] pairs
 *
 * Examples:
 * - 2D: [[0,1]] (xy)
 * - 3D: [[0,1], [0,2], [1,2]] (xy, xz, yz)
 * - 4D: [[0,1], [0,2], [0,3], [1,2], [1,3], [2,3]] (xy, xz, xw, yz, yw, zw)
 */
export function generateRotationPlanes(dimensions) {
    const planes = [];
    for (let i = 0; i < dimensions; i++) {
        for (let j = i + 1; j < dimensions; j++) {
            planes.push([i, j]);
        }
    }
    return planes;
}

/**
 * Get rotation plane name from axis indices
 * @param {number} axis1 - First axis index (0=x, 1=y, 2=z, 3=w, 4=v, ...)
 * @param {number} axis2 - Second axis index
 * @returns {string} Plane name like "xy", "xw", etc.
 */
export function getRotationPlaneName(axis1, axis2) {
    const axisNames = ['x', 'y', 'z', 'w', 'v', 'u', 't', 's'];
    return axisNames[axis1] + axisNames[axis2];
}

/**
 * Rotate a 2D point in a plane
 * @param {number} coord1 - First coordinate
 * @param {number} coord2 - Second coordinate
 * @param {number} angle - Rotation angle in radians
 * @returns {Array<number>} Rotated [coord1, coord2]
 */
function rotate2D(coord1, coord2, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        coord1 * cos - coord2 * sin,
        coord1 * sin + coord2 * cos
    ];
}

/**
 * Rotate an N-dimensional point through specified rotation planes
 * @param {Array<number>} point - N-dimensional point
 * @param {Object} rotations - Object with rotation angles (e.g., {xy: 0.5, xw: 0.3})
 * @param {number} dimensions - Number of dimensions (default: point.length)
 * @returns {Array<number>} Rotated N-dimensional point
 *
 * Example:
 * rotateND([1, 0, 0, 0], {xy: Math.PI/2, xw: Math.PI/4}, 4)
 */
export function rotateND(point, rotations, dimensions = null) {
    if (!dimensions) dimensions = point.length;

    // Clone point to avoid mutation
    const result = [...point];

    // Apply each rotation in order
    const planes = generateRotationPlanes(dimensions);

    for (const [axis1, axis2] of planes) {
        const planeName = getRotationPlaneName(axis1, axis2);
        const angle = rotations[planeName];

        if (angle && angle !== 0) {
            // Rotate in this plane
            const [newCoord1, newCoord2] = rotate2D(
                result[axis1],
                result[axis2],
                angle
            );
            result[axis1] = newCoord1;
            result[axis2] = newCoord2;
        }
    }

    return result;
}

/**
 * Project one dimension down using perspective projection
 * Projects from N dimensions to (N-1) dimensions
 * @param {Array<number>} point - N-dimensional point
 * @param {number} projectionDistance - Distance for perspective projection
 * @returns {Array<number>} (N-1)-dimensional point
 *
 * Example: [x, y, z, w] → [x', y', z'] where x'=x*factor, y'=y*factor, z'=z*factor
 */
function projectOneDimensionDown(point, projectionDistance) {
    if (point.length <= 1) return point;

    // Last dimension is the one we're projecting away
    const lastDim = point[point.length - 1];
    const denominator = projectionDistance - lastDim;

    // Prevent division by zero
    if (Math.abs(denominator) < CONFIG.PROJECTION_EPSILON) {
        console.warn('mathnd.projectOneDimensionDown: Near-zero denominator, using fallback projection');
        // Use orthographic projection as fallback
        const result = [];
        for (let i = 0; i < point.length - 1; i++) {
            result.push(point[i]);
        }
        return result;
    }

    const factor = projectionDistance / denominator;

    // Project all other dimensions
    const result = [];
    for (let i = 0; i < point.length - 1; i++) {
        result.push(point[i] * factor);
    }

    return result;
}

/**
 * Project an N-dimensional point to 3D using iterative perspective projection
 * @param {Array<number>} point - N-dimensional point
 * @param {number} projectionDistance - Distance for each projection step
 * @returns {Array<number>} 3D point [x, y, z] plus original highest dimension
 *
 * Process:
 * - N-dim → (N-1)-dim → ... → 3-dim
 * - Returns [x3d, y3d, z3d, originalHighestDim]
 */
export function projectNDto3D(point, projectionDistance = null) {
    // Validate input
    if (!Array.isArray(point) || point.length === 0) {
        console.error('mathnd.projectNDto3D: Invalid point', point);
        return [0, 0, 0, 0];
    }

    if (!projectionDistance) {
        projectionDistance = CONFIG.PROJECTION_DISTANCE_4D || 3;
    }

    // Validate projection distance
    if (typeof projectionDistance !== 'number' || projectionDistance <= 0) {
        console.warn('mathnd.projectNDto3D: Invalid projection distance, using default', projectionDistance);
        projectionDistance = 3;
    }

    // If already 3D or less, return as-is (padded to 4 elements)
    if (point.length <= 3) {
        const result = [...point];
        while (result.length < 3) result.push(0);
        result.push(point[point.length - 1] || 0); // Add highest dim
        return result;
    }

    // Save highest dimension for depth visualization
    const highestDim = point[point.length - 1];

    // Iteratively project down to 3D
    let current = point;
    while (current.length > 3) {
        current = projectOneDimensionDown(current, projectionDistance);
    }

    // Return [x, y, z, highestDim]
    return [...current, highestDim];
}

/**
 * Calculate factor from highest dimension for visual effects
 * @param {number} highestDim - Value of highest dimension
 * @param {number} dimensions - Total number of dimensions
 * @returns {number} Normalized factor (0-1)
 */
export function getHighestDimFactor(highestDim, dimensions = 4) {
    // Assume symmetric grid centered at origin
    // For grid size 4 with spacing 1.2: range is [-1.8, 1.8]
    const gridSize = CONFIG.GRID_SIZE || 4;
    const spacing = CONFIG.CELL_SPACING || 1.2;
    const maxCoord = (gridSize - 1) * spacing / 2;

    return (highestDim + maxCoord) / (2 * maxCoord);
}

/**
 * Calculate hue based on highest dimension
 * @param {number} highestDim - Value of highest dimension
 * @param {number} dimensions - Total number of dimensions
 * @returns {number} Hue value (0-1)
 */
export function getHueFromHighestDim(highestDim, dimensions = 4) {
    const factor = getHighestDimFactor(highestDim, dimensions);
    return (factor * CONFIG.HUE_RANGE + CONFIG.HUE_OFFSET) % 1;
}

/**
 * Calculate scale based on highest dimension for perspective effect
 * @param {number} highestDim - Value of highest dimension
 * @param {number} dimensions - Total number of dimensions
 * @returns {number} Scale factor
 */
export function getScaleFromHighestDim(highestDim, dimensions = 4) {
    const factor = getHighestDimFactor(highestDim, dimensions);
    return CONFIG.CELL_SCALE_MIN + factor * CONFIG.CELL_SCALE_RANGE;
}

/**
 * Calculate opacity based on highest dimension
 * @param {number} highestDim - Value of highest dimension
 * @param {number} dimensions - Total number of dimensions
 * @returns {number} Opacity (0-1)
 */
export function getOpacityFromHighestDim(highestDim, dimensions = 4) {
    const factor = getHighestDimFactor(highestDim, dimensions);
    return CONFIG.UNSELECTED_CELL_OPACITY_MIN +
           factor * CONFIG.UNSELECTED_CELL_OPACITY_RANGE;
}

/**
 * Backward compatibility: 4D rotation using old interface
 * @param {Array<number>} point - 4D point [x, y, z, w]
 * @param {Object} rotations - Rotation angles
 * @returns {Array<number>} Rotated 4D point
 */
export function rotate4D(point, rotations) {
    return rotateND(point, rotations, 4);
}

/**
 * Backward compatibility: 4D to 3D projection using old interface
 * @param {Array<number>} point - 4D point [x, y, z, w]
 * @returns {Array<number>} [x3d, y3d, z3d, w]
 */
export function project4Dto3D(point) {
    return projectNDto3D(point);
}

/**
 * Backward compatibility: Get W factor
 * @param {number} w - W coordinate
 * @returns {number} Normalized factor
 */
export function getWFactor(w) {
    return getHighestDimFactor(w, 4);
}

/**
 * Backward compatibility: Get hue from W
 * @param {number} w - W coordinate
 * @returns {number} Hue value
 */
export function getHueFromW(w) {
    return getHueFromHighestDim(w, 4);
}

/**
 * Backward compatibility: Get scale from W
 * @param {number} w - W coordinate
 * @returns {number} Scale factor
 */
export function getScaleFromW(w) {
    return getScaleFromHighestDim(w, 4);
}

/**
 * Backward compatibility: Get opacity from W
 * @param {number} w - W coordinate
 * @returns {number} Opacity
 */
export function getOpacityFromW(w) {
    return getOpacityFromHighestDim(w, 4);
}
