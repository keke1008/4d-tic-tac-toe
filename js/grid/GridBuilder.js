/**
 * Builder for 4D grid structure
 * Generates cell positions and data structures
 */

import { CONFIG } from '../config.js';

export class GridBuilder {
    /**
     * Create a grid builder
     */
    constructor() {
        this.gridSize = CONFIG.GRID_SIZE;
        this.cellSpacing = CONFIG.CELL_SPACING;
        this.offset = (this.gridSize - 1) * this.cellSpacing / 2;
    }

    /**
     * Generate all cell data structures for a 4D grid
     * @returns {Array} Array of cell objects with positions and coordinates
     */
    generateCells() {
        const cells = [];

        for (let w = 0; w < this.gridSize; w++) {
            for (let z = 0; z < this.gridSize; z++) {
                for (let y = 0; y < this.gridSize; y++) {
                    for (let x = 0; x < this.gridSize; x++) {
                        const cell = this.createCellData(x, y, z, w);
                        cells.push(cell);
                    }
                }
            }
        }

        return cells;
    }

    /**
     * Create data structure for a single cell
     * @param {number} x - X coordinate (0 to gridSize-1)
     * @param {number} y - Y coordinate (0 to gridSize-1)
     * @param {number} z - Z coordinate (0 to gridSize-1)
     * @param {number} w - W coordinate (0 to gridSize-1)
     * @returns {Object} Cell data object
     */
    createCellData(x, y, z, w) {
        return {
            pos4d: [
                x * this.cellSpacing - this.offset,
                y * this.cellSpacing - this.offset,
                z * this.cellSpacing - this.offset,
                w * this.cellSpacing - this.offset
            ],
            coords: { x, y, z, w },
            group: null,      // Will be set by renderer
            wireframe: null,  // Will be set by renderer
            selectionMesh: null, // Will be set by renderer
            marker: null      // Will be set when marker is placed
        };
    }

    /**
     * Generate all connection line endpoints
     * @returns {Array} Array of {pos4d1, pos4d2} connection line endpoints
     */
    generateConnections() {
        const connections = [];

        for (let w = 0; w < this.gridSize; w++) {
            for (let z = 0; z < this.gridSize; z++) {
                for (let y = 0; y < this.gridSize; y++) {
                    for (let x = 0; x < this.gridSize; x++) {
                        const pos4d = [
                            x * this.cellSpacing - this.offset,
                            y * this.cellSpacing - this.offset,
                            z * this.cellSpacing - this.offset,
                            w * this.cellSpacing - this.offset
                        ];

                        // Connect in X direction
                        if (x < this.gridSize - 1) {
                            connections.push({
                                pos4d1: pos4d,
                                pos4d2: [
                                    (x + 1) * this.cellSpacing - this.offset,
                                    y * this.cellSpacing - this.offset,
                                    z * this.cellSpacing - this.offset,
                                    w * this.cellSpacing - this.offset
                                ]
                            });
                        }

                        // Connect in Y direction
                        if (y < this.gridSize - 1) {
                            connections.push({
                                pos4d1: pos4d,
                                pos4d2: [
                                    x * this.cellSpacing - this.offset,
                                    (y + 1) * this.cellSpacing - this.offset,
                                    z * this.cellSpacing - this.offset,
                                    w * this.cellSpacing - this.offset
                                ]
                            });
                        }

                        // Connect in Z direction
                        if (z < this.gridSize - 1) {
                            connections.push({
                                pos4d1: pos4d,
                                pos4d2: [
                                    x * this.cellSpacing - this.offset,
                                    y * this.cellSpacing - this.offset,
                                    (z + 1) * this.cellSpacing - this.offset,
                                    w * this.cellSpacing - this.offset
                                ]
                            });
                        }

                        // Connect in W direction
                        if (w < this.gridSize - 1) {
                            connections.push({
                                pos4d1: pos4d,
                                pos4d2: [
                                    x * this.cellSpacing - this.offset,
                                    y * this.cellSpacing - this.offset,
                                    z * this.cellSpacing - this.offset,
                                    (w + 1) * this.cellSpacing - this.offset
                                ]
                            });
                        }
                    }
                }
            }
        }

        return connections;
    }

    /**
     * Get grid offset (centering offset)
     * @returns {number} Offset value
     */
    getOffset() {
        return this.offset;
    }
}
