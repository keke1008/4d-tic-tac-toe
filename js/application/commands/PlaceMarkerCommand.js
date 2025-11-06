/**
 * Command for placing a marker
 */

import { GameRules } from '../../domain/rules/GameRules.js';
import { GameState } from '../../domain/state/GameState.js';

/**
 * Place marker command
 */
export class PlaceMarkerCommand {
    /**
     * Create place marker command
     * @param {Array<number>} position - Position to place marker
     * @param {string} player - Player ('X' or 'O')
     */
    constructor(position, player) {
        this.position = position;
        this.player = player;
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

        // Convert to GameState and apply rules
        const state = GameState.fromPlain(gameState);
        const newState = GameRules.placeMarker(state, this.position, this.player);

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
