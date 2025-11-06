/**
 * Command pattern handler for undo/redo functionality
 * Maintains command history and supports branching
 */

/**
 * Command handler class
 */
export class CommandHandler {
    /**
     * Create command handler
     * @param {StateStore} stateStore - State store instance
     */
    constructor(stateStore) {
        this.store = stateStore;
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Execute a command
     * @param {Object} command - Command to execute
     */
    execute(command) {
        const currentState = this.store.getState().game;
        const newState = command.execute(currentState);

        // Update store with new state
        this.store.dispatch({
            type: 'GAME_STATE_UPDATED',
            payload: newState
        });

        // Truncate redo branch if we're not at the end
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add command to history
        this.history.push(command);
        this.historyIndex++;
    }

    /**
     * Undo last command
     */
    undo() {
        if (!this.canUndo()) {
            return;
        }

        const command = this.history[this.historyIndex];
        const currentState = this.store.getState().game;
        const newState = command.undo(currentState);

        this.store.dispatch({
            type: 'GAME_STATE_UPDATED',
            payload: newState
        });

        this.historyIndex--;
    }

    /**
     * Redo next command
     */
    redo() {
        if (!this.canRedo()) {
            return;
        }

        this.historyIndex++;
        const command = this.history[this.historyIndex];
        const currentState = this.store.getState().game;
        const newState = command.execute(currentState);

        this.store.dispatch({
            type: 'GAME_STATE_UPDATED',
            payload: newState
        });
    }

    /**
     * Check if undo is possible
     * @returns {boolean}
     */
    canUndo() {
        return this.historyIndex >= 0;
    }

    /**
     * Check if redo is possible
     * @returns {boolean}
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Clear history
     */
    clear() {
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Get history length
     * @returns {number}
     */
    getHistoryLength() {
        return this.history.length;
    }

    /**
     * Get current history index
     * @returns {number}
     */
    getHistoryIndex() {
        return this.historyIndex;
    }
}
