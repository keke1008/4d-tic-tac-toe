/**
 * Handles win condition checking for N-dimensional Tic-Tac-Toe
 * Supports 2D, 3D, 4D, 5D, 6D+
 */

export class WinChecker {
    /**
     * Create a win checker
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Size of the game grid
     */
    constructor(dimensions, gridSize) {
        this.dimensions = dimensions;
        this.gridSize = gridSize;
        this.directions = this.generateDirections();
    }

    /**
     * Check if the specified player has won at the given position
     * @param {Array<number>} coords - Coordinates [x, y, z, w, v, ...]
     * @param {string} player - Player to check ('X' or 'O')
     * @param {Array|Map} board - N-dimensional game board
     * @returns {boolean} True if player won
     */
    checkWin(coords, player, board) {
        for (const direction of this.directions) {
            let count = 1;

            // Check positive direction
            for (let i = 1; i < this.gridSize; i++) {
                const newCoords = coords.map((c, idx) => c + direction[idx] * i);

                if (!this.isValidCoordinate(newCoords)) break;
                if (this.getMarkerAt(board, newCoords) === player) {
                    count++;
                } else {
                    break;
                }
            }

            // Check negative direction
            for (let i = 1; i < this.gridSize; i++) {
                const newCoords = coords.map((c, idx) => c - direction[idx] * i);

                if (!this.isValidCoordinate(newCoords)) break;
                if (this.getMarkerAt(board, newCoords) === player) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= this.gridSize) return true;
        }

        return false;
    }

    /**
     * Generate all possible directions in N-dimensional space
     * Generates 3^n - 1 directions (all combinations of -1, 0, 1 except origin)
     * @returns {Array<Array<number>>} Array of direction vectors
     *
     * Examples:
     * - 2D: 8 directions (3^2 - 1 = 8)
     * - 3D: 26 directions (3^3 - 1 = 26)
     * - 4D: 80 directions (3^4 - 1 = 80)
     * - 5D: 242 directions (3^5 - 1 = 242)
     */
    generateDirections() {
        const directions = [];
        this.generateDirectionsRecursive([], directions);
        return directions;
    }

    /**
     * Recursively generate direction vectors
     * @param {Array<number>} current - Current partial direction
     * @param {Array<Array<number>>} directions - Accumulated directions
     */
    generateDirectionsRecursive(current, directions) {
        // Base case: we have a complete direction vector
        if (current.length === this.dimensions) {
            // Skip zero vector (no direction)
            if (!current.every(d => d === 0)) {
                directions.push([...current]);
            }
            return;
        }

        // Recursive case: try -1, 0, 1 for current dimension
        for (let delta = -1; delta <= 1; delta++) {
            this.generateDirectionsRecursive([...current, delta], directions);
        }
    }

    /**
     * Check if coordinates are within grid bounds
     * @param {Array<number>} coords - N-dimensional coordinates
     * @returns {boolean} True if valid
     */
    isValidCoordinate(coords) {
        if (coords.length !== this.dimensions) return false;

        for (const coord of coords) {
            if (coord < 0 || coord >= this.gridSize) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get marker at N-dimensional coordinates
     * Supports both nested arrays and Map-based storage
     * @param {Array|Map} board - Game board
     * @param {Array<number>} coords - Coordinates
     * @returns {string|null} Player marker or null
     */
    getMarkerAt(board, coords) {
        // If board is a Map (for high dimensions)
        if (board instanceof Map) {
            return board.get(coords.join(',')) || null;
        }

        // If board is nested arrays (for 2D-4D)
        let current = board;
        // Access in reverse order: board[w][z][y][x] for 4D
        for (let i = coords.length - 1; i >= 0; i--) {
            current = current[coords[i]];
            if (current === undefined) return null;
        }
        return current;
    }

    /**
     * Get total number of directions
     * @returns {number} Direction count
     */
    getDirectionCount() {
        return this.directions.length;
    }
}
