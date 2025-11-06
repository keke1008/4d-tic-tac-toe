/**
 * Main application service
 * Coordinates game flow and user actions
 */

import { Actions } from '../../infrastructure/state/actions.js';

/**
 * Game service - main application use cases
 */
export class GameService {
    /**
     * Create game service
     * @param {StateStore} stateStore - State store instance
     * @param {EventBus} eventBus - Event bus instance
     */
    constructor(stateStore, eventBus) {
        this.store = stateStore;
        this.eventBus = eventBus;
    }

    // ===== User Actions =====

    /**
     * Handle cell click (preview or confirm placement)
     * @param {Array<number>} position - Cell position
     */
    handleCellClick(position) {
        const state = this.store.getState();

        // Check if game is over
        if (state.game.gamePhase !== 'playing') {
            return;
        }

        // Check if clicking on already previewed cell (confirm placement)
        const previewCell = state.visual.previewCell;
        if (previewCell && this._positionsEqual(previewCell, position)) {
            // Confirm placement
            this.store.dispatch(Actions.placeMarker(position));
            this.store.dispatch(Actions.setPreviewCell(null));

            // Emit event
            this.eventBus.emit('game:markerPlaced', { position, player: state.game.currentPlayer });
        } else {
            // Set preview
            this.store.dispatch(Actions.setPreviewCell(position));
        }
    }

    /**
     * Reset game state (clears markers, history, but keeps settings)
     * This is a Command that changes state and emits completion event
     */
    resetGameState() {
        const settings = this.store.getState().settings;
        this.store.dispatch(Actions.resetGame(settings));
        this.store.dispatch(Actions.setPreviewCell(null));

        // Emit event: notify that game state has been reset (past tense)
        this.eventBus.emit('game:stateReset', { settings });
    }

    /**
     * Update game settings (dimensions, grid size, etc.)
     * This is a Command that changes settings and emits completion event
     * @param {Object} newSettings - New settings
     */
    updateSettings(newSettings) {
        const oldSettings = this.store.getState().settings;

        // Update state
        this.store.dispatch(Actions.updateSettings(newSettings));

        // Emit event: notify that settings have changed (past tense)
        this.eventBus.emit('settings:changed', {
            oldSettings,
            newSettings
        });
    }

    /**
     * Undo last move
     * This is a Command that changes state and emits completion event
     */
    undo() {
        if (!this.canUndo()) {
            return;
        }

        const state = this.store.getState();
        const lastMove = state.game.moveHistory[state.game.moveHistory.length - 1];

        this.store.dispatch(Actions.undoMove());

        // Emit event: notify that move has been undone (past tense)
        this.eventBus.emit('game:moveUndone', { move: lastMove });
    }

    /**
     * Redo last undone move
     * This is a Command that changes state and emits completion event
     */
    redo() {
        if (!this.canRedo()) {
            return;
        }

        const state = this.store.getState();
        const redoStack = state.game.redoStack || [];
        const moveToRedo = redoStack[redoStack.length - 1];

        this.store.dispatch(Actions.redoMove());

        // Emit event: notify that move has been redone (past tense)
        this.eventBus.emit('game:moveRedone', { move: moveToRedo });
    }

    /**
     * Toggle auto-rotation
     */
    toggleAutoRotate() {
        this.store.dispatch(Actions.toggleAutoRotate());
    }

    /**
     * Update rotation
     * @param {string} axis - Rotation axis
     * @param {number} delta - Rotation delta
     */
    updateRotation(axis, delta) {
        this.store.dispatch(Actions.updateRotation(axis, delta));
    }

    /**
     * Set hovered cell
     * @param {Array<number>|null} position - Cell position or null
     */
    setHoveredCell(position) {
        this.store.dispatch(Actions.setHoveredCell(position));
    }

    /**
     * Toggle settings modal
     */
    toggleSettingsModal() {
        this.store.dispatch(Actions.toggleSettingsModal());
    }

    // ===== Queries =====

    /**
     * Get current player
     * @returns {string} Current player ('X' or 'O')
     */
    getCurrentPlayer() {
        return this.store.getState().game.currentPlayer;
    }

    /**
     * Get game phase
     * @returns {string} Game phase ('playing', 'won', 'draw')
     */
    getGamePhase() {
        return this.store.getState().game.gamePhase;
    }

    /**
     * Get winner
     * @returns {string|null} Winner player or null
     */
    getWinner() {
        return this.store.getState().game.winner;
    }

    /**
     * Get move history
     * @returns {Array} Move history
     */
    getMoveHistory() {
        return this.store.getState().game.moveHistory;
    }

    /**
     * Get settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return this.store.getState().settings;
    }

    /**
     * Check if undo is possible
     * @returns {boolean}
     */
    canUndo() {
        return this.store.getState().game.moveHistory.length > 0 &&
               this.store.getState().game.gamePhase === 'playing';
    }

    /**
     * Check if redo is possible
     * @returns {boolean}
     */
    canRedo() {
        const redoStack = this.store.getState().game.redoStack || [];
        return redoStack.length > 0 &&
               this.store.getState().game.gamePhase === 'playing';
    }

    /**
     * Get board state
     * @returns {Object} Board state (plain object)
     */
    getBoardState() {
        return this.store.getState().game.board;
    }

    /**
     * Get preview cell
     * @returns {Array<number>|null} Preview cell position or null
     */
    getPreviewCell() {
        return this.store.getState().visual.previewCell;
    }

    /**
     * Get visual state
     * @returns {Object} Visual state
     */
    getVisualState() {
        return this.store.getState().visual;
    }

    // ===== Helper Methods =====

    /**
     * Check if two positions are equal
     * @param {Array<number>} pos1 - First position
     * @param {Array<number>} pos2 - Second position
     * @returns {boolean}
     * @private
     */
    _positionsEqual(pos1, pos2) {
        if (!pos1 || !pos2) return false;
        if (pos1.length !== pos2.length) return false;
        return pos1.every((val, index) => val === pos2[index]);
    }
}
