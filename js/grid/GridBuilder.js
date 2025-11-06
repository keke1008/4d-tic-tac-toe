/**
 * Builder for N-dimensional grid structure
 * Supports 2D, 3D, 4D, 5D, 6D+
 */

import { CONFIG } from '../config.js';

export class GridBuilder {
    /**
     * Create a grid builder
     * @param {Object} options - Configuration options
     * @param {number} options.dimensions - Number of dimensions (defaults to CONFIG.DIMENSIONS)
     * @param {number} options.gridSize - Size of grid (defaults to CONFIG.GRID_SIZE)
     * @param {number} options.cellSpacing - Spacing between cells (defaults to CONFIG.CELL_SPACING)
     */
    constructor(options = {}) {
        this.dimensions = options.dimensions ?? CONFIG.DIMENSIONS ?? 4;
        this.gridSize = options.gridSize ?? CONFIG.GRID_SIZE;
        this.cellSpacing = options.cellSpacing ?? CONFIG.CELL_SPACING;
        this.offset = (this.gridSize - 1) * this.cellSpacing / 2;
    }

    /**
     * Generate all cell data structures for an N-dimensional grid
     * @returns {Array} Array of cell objects with positions and coordinates
     *
     * Cell counts:
     * - 2D: gridSize^2 cells
     * - 3D: gridSize^3 cells
     * - 4D: gridSize^4 cells (256 for 4x4x4x4)
     * - 5D: gridSize^5 cells (1,024 for 4x4x4x4x4)
     */
    generateCells() {
        const cells = [];
        this.generateCellsRecursive([], cells);
        return cells;
    }

    /**
     * Recursively generate cells for N dimensions
     * @param {Array<number>} currentCoords - Current partial coordinates
     * @param {Array} cells - Accumulated cell objects
     */
    generateCellsRecursive(currentCoords, cells) {
        // Base case: we have complete coordinates
        if (currentCoords.length === this.dimensions) {
            const cell = this.createCellData(currentCoords);
            cells.push(cell);
            return;
        }

        // Recursive case: add next coordinate
        for (let i = 0; i < this.gridSize; i++) {
            this.generateCellsRecursive([...currentCoords, i], cells);
        }
    }

    /**
     * Create data structure for a single cell
     * @param {Array<number>} coords - Coordinates [x, y, z, w, v, ...]
     * @returns {Object} Cell data object
     */
    createCellData(coords) {
        // Convert grid coordinates to world positions
        const posND = coords.map(c => c * this.cellSpacing - this.offset);

        // Convert coords array to object with named properties
        // For backward compatibility: {x, y, z, w} for 4D
        const coordsObj = this.createCoordsObject(coords);

        return {
            posND: posND,           // N-dimensional position
            coords: coordsObj,      // Named coordinates
            coordsArray: coords,    // Array form for easy iteration
            group: null,            // Will be set by renderer
            wireframe: null,        // Will be set by renderer
            selectionMesh: null,    // Will be set by renderer
            marker: false           // Boolean flag: true when marker is placed
        };
    }

    /**
     * Convert coordinate array to object with named properties
     * @param {Array<number>} coords - Coordinate array
     * @returns {Object} Coordinate object {x, y, z, w, v, ...}
     */
    createCoordsObject(coords) {
        const names = ['x', 'y', 'z', 'w', 'v', 'u', 't', 's'];
        const obj = {};

        for (let i = 0; i < coords.length; i++) {
            const name = names[i] || `dim${i}`;
            obj[name] = coords[i];
        }

        return obj;
    }

    /**
     * Generate all connection line endpoints
     * @returns {Array} Array of {posND1, posND2} connection line endpoints
     *
     * Connection counts:
     * - 2D: 2 * gridSize * (gridSize-1) connections
     * - 3D: 3 * gridSize^2 * (gridSize-1) connections
     * - 4D: 4 * gridSize^3 * (gridSize-1) connections
     * - ND: dimensions * gridSize^(dimensions-1) * (gridSize-1) connections
     */
    generateConnections() {
        const connections = [];
        this.generateConnectionsRecursive([], connections);
        return connections;
    }

    /**
     * Recursively generate connections for N dimensions
     * @param {Array<number>} currentCoords - Current partial coordinates
     * @param {Array} connections - Accumulated connections
     */
    generateConnectionsRecursive(currentCoords, connections) {
        // Base case: we have complete coordinates
        if (currentCoords.length === this.dimensions) {
            // Create connections in each dimension
            for (let dim = 0; dim < this.dimensions; dim++) {
                // Only connect if not at the edge in this dimension
                if (currentCoords[dim] < this.gridSize - 1) {
                    const pos1 = this.coordsToPosition(currentCoords);

                    // Create neighbor coordinates (increment in this dimension)
                    const neighborCoords = [...currentCoords];
                    neighborCoords[dim]++;
                    const pos2 = this.coordsToPosition(neighborCoords);

                    connections.push({
                        posND1: pos1,
                        posND2: pos2,
                        coords1: currentCoords,
                        coords2: neighborCoords,
                        dimension: dim
                    });
                }
            }
            return;
        }

        // Recursive case: add next coordinate
        for (let i = 0; i < this.gridSize; i++) {
            this.generateConnectionsRecursive([...currentCoords, i], connections);
        }
    }

    /**
     * Convert grid coordinates to world position
     * @param {Array<number>} coords - Grid coordinates
     * @returns {Array<number>} World position
     */
    coordsToPosition(coords) {
        return coords.map(c => c * this.cellSpacing - this.offset);
    }

    /**
     * Get grid offset (centering offset)
     * @returns {number} Offset value
     */
    getOffset() {
        return this.offset;
    }

    /**
     * Get total number of cells
     * @returns {number} Total cells
     */
    getTotalCells() {
        return Math.pow(this.gridSize, this.dimensions);
    }

    /**
     * Get total number of connections
     * @returns {number} Total connections
     */
    getTotalConnections() {
        return this.dimensions * Math.pow(this.gridSize, this.dimensions - 1) * (this.gridSize - 1);
    }

    /**
     * Get dimensions
     * @returns {number} Number of dimensions
     */
    getDimensions() {
        return this.dimensions;
    }
}
