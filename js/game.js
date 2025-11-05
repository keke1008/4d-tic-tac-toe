/**
 * Game logic for N-dimensional Tic-Tac-Toe
 * Supports 2D, 3D, 4D, 5D, 6D+
 */

import { CONFIG } from './config.js';
import { WinChecker } from './game/WinChecker.js';

export class GameBoard {
    constructor() {
        this.dimensions = CONFIG.DIMENSIONS || 4;
        this.gridSize = CONFIG.GRID_SIZE;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winner = null;

        // Initialize win checker with dimensions
        this.winChecker = new WinChecker(this.dimensions, this.gridSize);
    }

    /**
     * Create an empty N-dimensional board
     * For 2D-4D: Uses nested arrays
     * For 5D+: Uses Map for better memory efficiency
     * @returns {Array|Map} Empty board
     */
    createEmptyBoard() {
        // For high dimensions (5D+), use Map for better performance
        if (this.dimensions >= 5) {
            return new Map();
        }

        // For 2D-4D, use nested arrays (backward compatible)
        return this.createNestedArray(this.dimensions);
    }

    /**
     * Recursively create nested array for N dimensions
     * @param {number} remainingDims - Remaining dimensions to create
     * @returns {Array} Nested array
     */
    createNestedArray(remainingDims) {
        if (remainingDims === 1) {
            return new Array(this.gridSize).fill(null);
        }

        const arr = [];
        for (let i = 0; i < this.gridSize; i++) {
            arr.push(this.createNestedArray(remainingDims - 1));
        }
        return arr;
    }

    /**
     * Validate coordinates
     * @param {Array<number>} coords - Coordinates to validate
     * @returns {boolean} True if coordinates are valid
     */
    isValidCoordinate(coords) {
        // Check if coords is an array
        if (!Array.isArray(coords)) {
            console.warn('GameBoard: Coordinates must be an array');
            return false;
        }

        // Check dimension count
        if (coords.length !== this.dimensions) {
            console.warn(`GameBoard: Expected ${this.dimensions} coordinates, got ${coords.length}`);
            return false;
        }

        // Check each coordinate is within bounds
        for (let i = 0; i < coords.length; i++) {
            const coord = coords[i];
            if (typeof coord !== 'number' || !Number.isInteger(coord)) {
                console.warn(`GameBoard: Coordinate at index ${i} must be an integer, got ${coord}`);
                return false;
            }
            if (coord < 0 || coord >= this.gridSize) {
                console.warn(`GameBoard: Coordinate ${coord} at index ${i} is out of bounds [0, ${this.gridSize - 1}]`);
                return false;
            }
        }

        return true;
    }

    /**
     * Place a marker at the specified coordinates
     * @param {...number|Array<number>} args - Either individual coords or array
     * @returns {boolean} True if placement was successful
     *
     * Examples:
     * - 2D: placeMarker(x, y) or placeMarker([x, y])
     * - 3D: placeMarker(x, y, z) or placeMarker([x, y, z])
     * - 4D: placeMarker(x, y, z, w) or placeMarker([x, y, z, w])
     */
    placeMarker(...args) {
        const coords = Array.isArray(args[0]) ? args[0] : args;

        // Validate coordinates
        if (!this.isValidCoordinate(coords)) {
            return false;
        }

        if (this.gameOver) return false;
        if (this.getMarker(...coords)) return false;

        this.setMarkerAt(coords, this.currentPlayer);
        return true;
    }

    /**
     * Check if the current player has won
     * Delegates to WinChecker
     * @param {...number|Array<number>} args - Either individual coords or array
     * @returns {boolean} True if current player won
     */
    checkWin(...args) {
        const coords = Array.isArray(args[0]) ? args[0] : args;
        return this.winChecker.checkWin(coords, this.currentPlayer, this.board);
    }

    /**
     * Set marker at coordinates
     * @param {Array<number>} coords - Coordinates
     * @param {string} player - Player marker
     */
    setMarkerAt(coords, player) {
        // Validate coordinates
        if (!this.isValidCoordinate(coords)) {
            console.error('GameBoard.setMarkerAt: Invalid coordinates', coords);
            return;
        }

        if (this.board instanceof Map) {
            // Map-based storage
            this.board.set(coords.join(','), player);
        } else {
            // Nested array storage (reverse order: board[w][z][y][x] for 4D)
            let current = this.board;
            for (let i = coords.length - 1; i > 0; i--) {
                current = current[coords[i]];
                if (!current) {
                    console.error('GameBoard.setMarkerAt: Invalid nested array access', coords);
                    return;
                }
            }
            current[coords[0]] = player;
        }
    }

    /**
     * Get marker at coordinates
     * @param {...number|Array<number>} args - Either individual coords or array
     * @returns {string|null} Player marker or null
     */
    getMarker(...args) {
        const coords = Array.isArray(args[0]) ? args[0] : args;

        // Validate coordinates
        if (!this.isValidCoordinate(coords)) {
            return null;
        }

        if (this.board instanceof Map) {
            return this.board.get(coords.join(',')) || null;
        }

        // Nested array access (reverse order)
        let current = this.board;
        for (let i = coords.length - 1; i >= 0; i--) {
            current = current[coords[i]];
            if (current === undefined) return null;
        }
        return current;
    }

    /**
     * Check if the board is full
     * @returns {boolean}
     */
    isBoardFull() {
        const totalCells = Math.pow(this.gridSize, this.dimensions);

        if (this.board instanceof Map) {
            return this.board.size === totalCells;
        }

        // Check nested array
        return this.countFilledCells() === totalCells;
    }

    /**
     * Count filled cells in nested array
     * @param {Array} arr - Current array level
     * @param {number} depth - Current depth
     * @returns {number} Number of filled cells
     */
    countFilledCells(arr = this.board, depth = this.dimensions) {
        if (depth === 1) {
            return arr.filter(cell => cell !== null).length;
        }

        let count = 0;
        for (const subArray of arr) {
            count += this.countFilledCells(subArray, depth - 1);
        }
        return count;
    }

    /**
     * Switch to the other player
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    /**
     * Get the current player
     * @returns {string} 'X' or 'O'
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /**
     * Reset the game
     */
    reset() {
        this.board = this.createEmptyBoard();
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winner = null;
    }

    /**
     * Mark game as over
     * @param {string|null} winner - 'X', 'O', or null for draw
     */
    setGameOver(winner = null) {
        this.gameOver = true;
        this.winner = winner;
    }

    /**
     * Check if game is over
     * @returns {boolean}
     */
    isGameOver() {
        return this.gameOver;
    }

    /**
     * Get the winner
     * @returns {string|null}
     */
    getWinner() {
        return this.winner;
    }

    /**
     * Get dimensions
     * @returns {number}
     */
    getDimensions() {
        return this.dimensions;
    }
}
