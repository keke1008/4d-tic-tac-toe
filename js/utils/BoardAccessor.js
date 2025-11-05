/**
 * Utility for accessing N-dimensional game board
 * Supports both nested arrays (2D-4D) and Map-based storage (5D+)
 * Centralizes board access logic to avoid duplication
 */

export class BoardAccessor {
    /**
     * Get marker at N-dimensional coordinates
     * @param {Array|Map} board - Game board (nested arrays or Map)
     * @param {Array<number>} coords - N-dimensional coordinates
     * @returns {string|null} Player marker ('X', 'O') or null if empty
     */
    static getMarkerAt(board, coords) {
        // Handle Map-based storage (5D+)
        if (board instanceof Map) {
            return board.get(coords.join(',')) || null;
        }

        // Handle nested array storage (2D-4D)
        // Access in reverse order: board[w][z][y][x] for 4D
        let current = board;
        for (let i = coords.length - 1; i >= 0; i--) {
            current = current[coords[i]];
            if (current === undefined) return null;
        }
        return current;
    }

    /**
     * Set marker at N-dimensional coordinates
     * @param {Array|Map} board - Game board (nested arrays or Map)
     * @param {Array<number>} coords - N-dimensional coordinates
     * @param {string} player - Player marker ('X' or 'O')
     */
    static setMarkerAt(board, coords, player) {
        // Handle Map-based storage (5D+)
        if (board instanceof Map) {
            board.set(coords.join(','), player);
            return;
        }

        // Handle nested array storage (2D-4D)
        // Access in reverse order: board[w][z][y][x] for 4D
        let current = board;
        for (let i = coords.length - 1; i > 0; i--) {
            current = current[coords[i]];
        }
        current[coords[0]] = player;
    }

    /**
     * Check if coordinates are valid for given board dimensions and size
     * @param {Array<number>} coords - Coordinates to validate
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Size of grid in each dimension
     * @returns {boolean} True if valid
     */
    static isValidCoordinate(coords, dimensions, gridSize) {
        // Check if coords is an array
        if (!Array.isArray(coords)) {
            return false;
        }

        // Check dimension count
        if (coords.length !== dimensions) {
            return false;
        }

        // Check each coordinate is within bounds
        for (let i = 0; i < coords.length; i++) {
            const coord = coords[i];
            if (typeof coord !== 'number' || !Number.isInteger(coord)) {
                return false;
            }
            if (coord < 0 || coord >= gridSize) {
                return false;
            }
        }

        return true;
    }
}
