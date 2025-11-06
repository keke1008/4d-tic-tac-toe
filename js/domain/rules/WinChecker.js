/**
 * Win condition checker for N-dimensional Tic-Tac-Toe
 * Pure functions, no side effects
 */

/**
 * Win checker class
 */
export class WinChecker {
    /**
     * Check if a position results in a winning line
     * @param {BoardState} board - Current board state
     * @param {Array<number>} position - Position of last placed marker
     * @param {string} player - Player who placed the marker
     * @param {Object} settings - Game settings { dimensions, gridSize }
     * @returns {boolean} True if this position creates a winning line
     */
    static hasWinningLine(board, position, player, settings) {
        const directions = this.generateDirections(settings.dimensions);
        const winLength = settings.gridSize;

        for (const direction of directions) {
            if (this.checkDirection(board, position, player, direction, winLength)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check a specific direction for winning line
     * @param {BoardState} board - Board state
     * @param {Array<number>} start - Starting position
     * @param {string} player - Player to check
     * @param {Array<number>} direction - Direction vector
     * @param {number} winLength - Required length to win
     * @returns {boolean}
     */
    static checkDirection(board, start, player, direction, winLength) {
        let count = 1; // Count the starting position

        // Check positive direction
        count += this.countInDirection(board, start, player, direction, board.gridSize, 1);

        // Check negative direction
        count += this.countInDirection(board, start, player, direction, board.gridSize, -1);

        return count >= winLength;
    }

    /**
     * Count consecutive markers in a direction
     * @param {BoardState} board - Board state
     * @param {Array<number>} start - Starting position
     * @param {string} player - Player to check
     * @param {Array<number>} direction - Direction vector
     * @param {number} gridSize - Grid size (for bounds checking)
     * @param {number} multiplier - Direction multiplier (1 or -1)
     * @returns {number} Count of consecutive markers
     */
    static countInDirection(board, start, player, direction, gridSize, multiplier) {
        let count = 0;
        let current = [...start];

        while (true) {
            // Move in direction
            for (let i = 0; i < current.length; i++) {
                current[i] += direction[i] * multiplier;
            }

            // Check bounds
            if (!this.isInBounds(current, gridSize)) {
                break;
            }

            // Check marker
            const marker = board.get(current);
            if (marker !== player) {
                break;
            }

            count++;
        }

        return count;
    }

    /**
     * Check if position is within bounds
     * @param {Array<number>} position - Position to check
     * @param {number} gridSize - Grid size
     * @returns {boolean}
     */
    static isInBounds(position, gridSize) {
        return position.every(coord => coord >= 0 && coord < gridSize);
    }

    /**
     * Generate all possible direction vectors for N dimensions
     * For N dimensions, there are 3^N - 1 directions
     * @param {number} dimensions - Number of dimensions
     * @returns {Array<Array<number>>} Array of direction vectors
     */
    static generateDirections(dimensions) {
        const directions = [];

        // Generate all combinations of -1, 0, 1 for each dimension
        const generate = (current, depth) => {
            if (depth === dimensions) {
                // Exclude the zero vector (0, 0, ..., 0)
                if (!current.every(v => v === 0)) {
                    directions.push([...current]);
                }
                return;
            }

            for (const value of [-1, 0, 1]) {
                current[depth] = value;
                generate(current, depth + 1);
            }
        };

        generate(new Array(dimensions), 0);
        return directions;
    }

    /**
     * Get expected number of directions for N dimensions
     * @param {number} dimensions - Number of dimensions
     * @returns {number} Expected count (3^N - 1)
     */
    static getDirectionCount(dimensions) {
        return Math.pow(3, dimensions) - 1;
    }
}
