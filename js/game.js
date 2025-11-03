/**
 * Game logic for 4D Tic-Tac-Toe
 */

import { CONFIG } from './config.js';
import { WinChecker } from './game/WinChecker.js';

export class GameBoard {
    constructor() {
        this.gridSize = CONFIG.GRID_SIZE;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winner = null;

        // Initialize win checker
        this.winChecker = new WinChecker(this.gridSize);
    }

    /**
     * Create an empty 4D board
     * @returns {Array} 4D array of null values
     */
    createEmptyBoard() {
        const board = [];
        for (let w = 0; w < this.gridSize; w++) {
            board[w] = [];
            for (let z = 0; z < this.gridSize; z++) {
                board[w][z] = [];
                for (let y = 0; y < this.gridSize; y++) {
                    board[w][z][y] = new Array(this.gridSize).fill(null);
                }
            }
        }
        return board;
    }

    /**
     * Place a mark at the specified coordinates
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     * @returns {boolean} True if placement was successful
     */
    placeMarker(x, y, z, w) {
        if (this.gameOver) return false;
        if (this.board[w][z][y][x]) return false;

        this.board[w][z][y][x] = this.currentPlayer;
        return true;
    }

    /**
     * Check if the current player has won
     * Delegates to WinChecker
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     * @returns {boolean} True if current player won
     */
    checkWin(x, y, z, w) {
        return this.winChecker.checkWin(x, y, z, w, this.currentPlayer, this.board);
    }


    /**
     * Check if the board is full
     * @returns {boolean}
     */
    isBoardFull() {
        for (let w = 0; w < this.gridSize; w++) {
            for (let z = 0; z < this.gridSize; z++) {
                for (let y = 0; y < this.gridSize; y++) {
                    for (let x = 0; x < this.gridSize; x++) {
                        if (!this.board[w][z][y][x]) return false;
                    }
                }
            }
        }
        return true;
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
     * Get marker at coordinates
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     * @returns {string|null}
     */
    getMarker(x, y, z, w) {
        return this.board[w][z][y][x];
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
}
