/**
 * Immutable game state
 * All methods return new instances, never mutate existing state
 */

/**
 * Game state class (Immutable)
 */
export class GameState {
    /**
     * Create a new game state
     * @param {Object} data - State data
     */
    constructor(data = {}) {
        this.board = data.board || null;
        this.currentPlayer = data.currentPlayer || 'X';
        this.gamePhase = data.gamePhase || 'playing'; // 'playing' | 'won' | 'draw'
        this.winner = data.winner || null;
        this.moveHistory = data.moveHistory || [];
        this.settings = data.settings || null;

        // Freeze to ensure immutability
        Object.freeze(this);
    }

    /**
     * Create initial game state
     * @param {Object} settings - Game settings { dimensions, gridSize }
     * @returns {GameState}
     */
    static initial(settings) {
        // Import BoardState dynamically to avoid circular dependency
        const BoardState = require('./BoardState.js').BoardState;

        return new GameState({
            board: BoardState.empty(settings.dimensions, settings.gridSize),
            currentPlayer: 'X',
            gamePhase: 'playing',
            winner: null,
            moveHistory: [],
            settings: { ...settings }
        });
    }

    /**
     * Create new state with marker placed
     * @param {Array<number>} position - Position to place marker
     * @param {string} player - Player ('X' or 'O')
     * @returns {GameState}
     */
    withMarker(position, player) {
        return new GameState({
            ...this,
            board: this.board.set(position, player),
            moveHistory: [
                ...this.moveHistory,
                { position, player, timestamp: Date.now() }
            ]
        });
    }

    /**
     * Create new state with different current player
     * @param {string} player - Player ('X' or 'O')
     * @returns {GameState}
     */
    withPlayer(player) {
        return new GameState({
            ...this,
            currentPlayer: player
        });
    }

    /**
     * Create new state marking game as won
     * @param {string} winner - Winner ('X' or 'O')
     * @returns {GameState}
     */
    withWinner(winner) {
        return new GameState({
            ...this,
            gamePhase: 'won',
            winner: winner
        });
    }

    /**
     * Create new state marking game as draw
     * @returns {GameState}
     */
    withDraw() {
        return new GameState({
            ...this,
            gamePhase: 'draw',
            winner: null
        });
    }

    /**
     * Get marker at position
     * @param {Array<number>} position - Position
     * @returns {string|null} Player marker or null
     */
    getMarkerAt(position) {
        if (!this.board) return null;
        return this.board.get(position);
    }

    /**
     * Check if move is valid
     * @param {Array<number>} position - Position
     * @returns {boolean}
     */
    isValidMove(position) {
        if (this.gamePhase !== 'playing') return false;
        if (!this.board) return false;
        return this.board.isEmpty(position);
    }

    /**
     * Check if board is full
     * @returns {boolean}
     */
    isBoardFull() {
        if (!this.board) return false;
        return this.board.isFull();
    }

    /**
     * Check if game is over
     * @returns {boolean}
     */
    isGameOver() {
        return this.gamePhase !== 'playing';
    }

    /**
     * Convert to plain object (for storage in Redux)
     * @returns {Object}
     */
    toPlain() {
        return {
            board: this.board ? this.board.toPlain() : null,
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase,
            winner: this.winner,
            moveHistory: this.moveHistory,
            settings: this.settings
        };
    }

    /**
     * Create from plain object
     * @param {Object} data - Plain object data
     * @returns {GameState}
     */
    static fromPlain(data) {
        const BoardState = require('./BoardState.js').BoardState;

        return new GameState({
            ...data,
            board: data.board ? BoardState.fromPlain(data.board) : null
        });
    }
}
