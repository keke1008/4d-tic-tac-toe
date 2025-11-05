/**
 * Immutable board state
 * Handles both Array and Map storage strategies
 */

/**
 * Board state class (Immutable)
 */
export class BoardState {
    /**
     * Create a new board state
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Size of grid in each dimension
     * @param {Array|Map} storage - Internal storage (Array for 2D-4D, Map for 5D+)
     */
    constructor(dimensions, gridSize, storage) {
        this.dimensions = dimensions;
        this.gridSize = gridSize;
        this._storage = storage;

        // Freeze to ensure immutability
        Object.freeze(this);
    }

    /**
     * Create empty board
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Size of grid
     * @returns {BoardState}
     */
    static empty(dimensions, gridSize) {
        const storage = dimensions >= 5
            ? new Map()
            : createNestedArray(dimensions, gridSize);

        return new BoardState(dimensions, gridSize, storage);
    }

    /**
     * Get marker at position
     * @param {Array<number>} position - Position coordinates
     * @returns {string|null} Player marker or null
     */
    get(position) {
        if (this._storage instanceof Map) {
            return this._storage.get(position.join(',')) || null;
        }

        // Navigate nested array
        let current = this._storage;
        for (let i = position.length - 1; i >= 0; i--) {
            if (!current || current[position[i]] === undefined) {
                return null;
            }
            current = current[position[i]];
        }
        return current;
    }

    /**
     * Set marker at position (returns new BoardState)
     * @param {Array<number>} position - Position coordinates
     * @param {string} value - Player marker
     * @returns {BoardState}
     */
    set(position, value) {
        if (this._storage instanceof Map) {
            const newStorage = new Map(this._storage);
            newStorage.set(position.join(','), value);
            return new BoardState(this.dimensions, this.gridSize, newStorage);
        }

        // Clone nested array and set value
        const newStorage = deepCloneArray(this._storage);
        let current = newStorage;
        for (let i = position.length - 1; i > 0; i--) {
            current = current[position[i]];
        }
        current[position[0]] = value;

        return new BoardState(this.dimensions, this.gridSize, newStorage);
    }

    /**
     * Check if position is empty
     * @param {Array<number>} position - Position coordinates
     * @returns {boolean}
     */
    isEmpty(position) {
        // Validate position dimensions
        if (!Array.isArray(position) || position.length !== this.dimensions) {
            return false;
        }

        // Validate bounds
        for (const coord of position) {
            if (!Number.isInteger(coord) || coord < 0 || coord >= this.gridSize) {
                return false;
            }
        }

        return this.get(position) === null;
    }

    /**
     * Check if board is full
     * @returns {boolean}
     */
    isFull() {
        const totalCells = Math.pow(this.gridSize, this.dimensions);

        if (this._storage instanceof Map) {
            return this._storage.size === totalCells;
        }

        return countFilledCells(this._storage, this.dimensions) === totalCells;
    }

    /**
     * Convert to plain object
     * @returns {Object}
     */
    toPlain() {
        if (this._storage instanceof Map) {
            return {
                dimensions: this.dimensions,
                gridSize: this.gridSize,
                type: 'map',
                data: Array.from(this._storage.entries())
            };
        }

        return {
            dimensions: this.dimensions,
            gridSize: this.gridSize,
            type: 'array',
            data: this._storage
        };
    }

    /**
     * Create from plain object
     * @param {Object} plain - Plain object
     * @returns {BoardState}
     */
    static fromPlain(plain) {
        let storage;

        if (plain.type === 'map') {
            storage = new Map(plain.data);
        } else {
            storage = plain.data;
        }

        return new BoardState(plain.dimensions, plain.gridSize, storage);
    }
}

/**
 * Create nested array for N dimensions
 * @param {number} dims - Number of dimensions
 * @param {number} size - Size in each dimension
 * @returns {Array}
 */
function createNestedArray(dims, size) {
    if (dims === 1) {
        return new Array(size).fill(null);
    }

    return Array.from({ length: size }, () => createNestedArray(dims - 1, size));
}

/**
 * Deep clone nested array
 * @param {Array} arr - Array to clone
 * @returns {Array}
 */
function deepCloneArray(arr) {
    return arr.map(item => {
        if (Array.isArray(item)) {
            return deepCloneArray(item);
        }
        return item;
    });
}

/**
 * Count filled cells in nested array
 * @param {Array} arr - Nested array
 * @param {number} depth - Current depth
 * @returns {number}
 */
function countFilledCells(arr, depth) {
    if (depth === 1) {
        return arr.filter(cell => cell !== null).length;
    }

    return arr.reduce((sum, subArray) => {
        return sum + countFilledCells(subArray, depth - 1);
    }, 0);
}
