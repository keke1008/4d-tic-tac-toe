/**
 * Command for resetting the game
 */

import { GameRules } from '../../domain/rules/GameRules.js';
import { GameState } from '../../domain/state/GameState.js';

/**
 * Reset game command
 */
export class ResetGameCommand {
    /**
     * Create reset game command
     * @param {Object} settings - Game settings
     */
    constructor(settings) {
        this.settings = settings;
        this.previousState = null;
    }

    /**
     * Execute command
     * @param {Object} gameState - Current game state (plain object)
     * @returns {Object} New game state (plain object)
     */
    execute(gameState) {
        // Store previous state for undo
        this.previousState = gameState;

        // Create new initial state with settings
        const state = GameState.fromPlain(gameState);
        const newState = GameRules.updateSettings(state, this.settings);

        return newState.toPlain();
    }

    /**
     * Undo command
     * @param {Object} gameState - Current game state (plain object)
     * @returns {Object} Previous game state (plain object)
     */
    undo(gameState) {
        return this.previousState;
    }
}
