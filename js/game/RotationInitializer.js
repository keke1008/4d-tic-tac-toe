/**
 * Utility for initializing rotation state for N-dimensional space
 * Creates rotation object with all rotation planes set to 0
 */

import { generateRotationPlanes, getRotationPlaneName } from '../mathnd.js';

export class RotationInitializer {
    /**
     * Create initial rotation state for given dimensions
     * @param {number} dimensions - Number of dimensions
     * @returns {Object} Rotation object with all planes initialized to 0
     */
    static createRotations(dimensions) {
        const rotations = {};
        const planes = generateRotationPlanes(dimensions);

        for (const [axis1, axis2] of planes) {
            const planeName = getRotationPlaneName(axis1, axis2);
            rotations[planeName] = 0;
        }

        return rotations;
    }
}
