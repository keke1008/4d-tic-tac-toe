/**
 * Pure game logic functions
 * No side effects, fully testable
 */

import { GameState } from '../state/GameState.js';
import { WinChecker } from './WinChecker.js';

/**
 * Game rules - all pure functions
 */
export class GameRules {
    /**
     * Attempt to place marker
     * @param {GameState} state - Current state
     * @param {Array<number>} position - Position to place marker
     * @param {string} [player] - Player (defaults to current player)
     * @returns {GameState} New state (unchanged if invalid move)
     */
    static placeMarker(state, position, player = null) {
        const actualPlayer = player || state.currentPlayer;

        // Validate move
        if (!state.isValidMove(position)) {
            return state;
        }

        // Place marker
        let newState = state.withMarker(position, actualPlayer);

        // Check win condition
        if (WinChecker.hasWinningLine(newState.board, position, actualPlayer, newState.settings)) {
            return newState.withWinner(actualPlayer);
        }

        // Check draw
        if (newState.isBoardFull()) {
            return newState.withDraw();
        }

        // Switch player
        return newState.withPlayer(this.nextPlayer(actualPlayer));
    }

    /**
     * Get next player
     * @param {string} current - Current player
     * @returns {string} Next player
     */
    static nextPlayer(current) {
        return current === 'X' ? 'O' : 'X';
    }

    /**
     * Reset game
     * @param {GameState} state - Current state
     * @returns {GameState} New initial state
     */
    static reset(state) {
        return GameState.initial(state.settings);
    }

    /**
     * Update settings (requires full reset)
     * @param {GameState} state - Current state
     * @param {Object} newSettings - New settings
     * @returns {GameState} New initial state with new settings
     */
    static updateSettings(state, newSettings) {
        return GameState.initial(newSettings);
    }

    /**
     * Check if undo is possible
     * @param {GameState} state - Current state
     * @returns {boolean}
     */
    static canUndo(state) {
        return state.moveHistory.length > 0;
    }

    /**
     * Undo last move
     * @param {GameState} state - Current state
     * @returns {GameState} State with last move undone
     */
    static undo(state) {
        if (!this.canUndo(state)) {
            return state;
        }

        // Rebuild state from history (excluding last move)
        const newHistory = state.moveHistory.slice(0, -1);
        let newState = GameState.initial(state.settings);

        // Replay all moves except the last one
        for (const move of newHistory) {
            newState = newState.withMarker(move.position, move.player);
        }

        // Determine current player
        const lastPlayer = state.moveHistory[state.moveHistory.length - 1].player;
        newState = newState.withPlayer(lastPlayer); // It's the turn of the player who just undid

        return newState;
    }

    /**
     * Get all valid moves
     * @param {GameState} state - Current state
     * @returns {Array<Array<number>>} Array of valid positions
     */
    static getValidMoves(state) {
        if (state.gamePhase !== 'playing') {
            return [];
        }

        const validMoves = [];
        const { dimensions, gridSize } = state.settings;

        // Generate all possible positions
        const generatePositions = (dims, current = []) => {
            if (dims === 0) {
                if (state.isValidMove(current)) {
                    validMoves.push([...current]);
                }
                return;
            }

            for (let i = 0; i < gridSize; i++) {
                generatePositions(dims - 1, [i, ...current]);
            }
        };

        generatePositions(dimensions);
        return validMoves;
    }

    /**
     * Check if position is valid coordinate
     * @param {Array<number>} position - Position to check
     * @param {Object} settings - Game settings
     * @returns {boolean}
     */
    static isValidPosition(position, settings) {
        if (!Array.isArray(position)) return false;
        if (position.length !== settings.dimensions) return false;

        return position.every(coord => {
            return Number.isInteger(coord) && coord >= 0 && coord < settings.gridSize;
        });
    }
}
