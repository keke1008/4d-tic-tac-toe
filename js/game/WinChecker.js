/**
 * Handles win condition checking for 4D Tic-Tac-Toe
 * Checks all possible directions in 4D space
 */

export class WinChecker {
    /**
     * Create a win checker
     * @param {number} gridSize - Size of the game grid
     */
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.directions = this.generateDirections();
    }

    /**
     * Check if the specified player has won at the given position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {number} w - W coordinate
     * @param {string} player - Player to check ('X' or 'O')
     * @param {Array} board - 4D game board
     * @returns {boolean} True if player won
     */
    checkWin(x, y, z, w, player, board) {
        for (const [dx, dy, dz, dw] of this.directions) {
            let count = 1;

            // Check positive direction
            for (let i = 1; i < this.gridSize; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                const nz = z + dz * i;
                const nw = w + dw * i;

                if (!this.isValidCoordinate(nx, ny, nz, nw)) break;
                if (board[nw][nz][ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // Check negative direction
            for (let i = 1; i < this.gridSize; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                const nz = z - dz * i;
                const nw = w - dw * i;

                if (!this.isValidCoordinate(nx, ny, nz, nw)) break;
                if (board[nw][nz][ny][nx] === player) {
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
     * Generate all possible directions in 4D space
     * @returns {Array} Array of direction vectors [dx, dy, dz, dw]
     */
    generateDirections() {
        const directions = [];
        for (let dw = -1; dw <= 1; dw++) {
            for (let dz = -1; dz <= 1; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        // Skip zero vector (no direction)
                        if (dw === 0 && dz === 0 && dy === 0 && dx === 0) continue;
                        directions.push([dx, dy, dz, dw]);
                    }
                }
            }
        }
        return directions;
    }

    /**
     * Check if coordinates are within grid bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {number} w - W coordinate
     * @returns {boolean} True if valid
     */
    isValidCoordinate(x, y, z, w) {
        return x >= 0 && x < this.gridSize &&
               y >= 0 && y < this.gridSize &&
               z >= 0 && z < this.gridSize &&
               w >= 0 && w < this.gridSize;
    }
}
