/**
 * UI Manager for Presentation Layer (Phase 4)
 * Subscribes to state changes and updates DOM accordingly
 * Pure view layer - no business logic
 */

import { VERSION } from '../../config.js';

/**
 * UIManager - manages UI updates based on state
 */
export class UIManager {
    /**
     * Create UI Manager
     * @param {StateStore} stateStore - State store instance (optional for backward compatibility)
     */
    constructor(stateStore = null) {
        // DOM elements
        this.statusElement = document.getElementById('status');
        this.markerElement = document.getElementById('player-marker');
        this.textElement = document.getElementById('status-text');
        this.versionElement = document.getElementById('version');

        // State store (new architecture)
        this.store = stateStore;

        // Initialize
        this.updateVersion();

        // Subscribe to state changes if store provided
        if (this.store) {
            this.store.subscribe((state) => this.onStateChange(state));
        }
    }

    /**
     * Handle state changes (new architecture)
     * @param {Object} state - Current state
     * @private
     */
    onStateChange(state) {
        // Update status based on game phase
        if (state.game.gamePhase === 'won') {
            this.showVictoryStatus(`プレイヤー ${state.game.winner} の勝利！`);
        } else if (state.game.gamePhase === 'draw') {
            this.showDrawStatus();
        } else {
            this.updateStatus(state.game.currentPlayer);
        }
    }

    /**
     * Update status display with current player
     * @param {string} currentPlayer - Current player ('X' or 'O')
     */
    updateStatus(currentPlayer) {
        if (!this.statusElement || !this.markerElement || !this.textElement) return;

        // Update player marker color
        this.markerElement.className = currentPlayer === 'X' ? 'player-x' : 'player-o';
        this.markerElement.style.display = 'inline-block';

        // Update status border color to match current player
        this.statusElement.classList.remove('player-x-turn', 'player-o-turn', 'victory');
        this.statusElement.classList.add(
            currentPlayer === 'X' ? 'player-x-turn' : 'player-o-turn'
        );

        // Normal turn display
        this.textElement.textContent = ' のターン';
    }

    /**
     * Show victory status
     * @param {string} message - Victory message
     */
    showVictoryStatus(message) {
        if (!this.statusElement || !this.textElement) return;

        // Extract winner from message
        const winner = message.includes('X') ? 'X' : 'O';

        // Update marker
        if (this.markerElement) {
            this.markerElement.className = winner === 'X' ? 'player-x' : 'player-o';
            this.markerElement.style.display = 'inline-block';
        }

        // Add victory styling
        this.statusElement.classList.remove('player-x-turn', 'player-o-turn');
        this.statusElement.classList.add('victory');

        // Show victory message
        this.textElement.textContent = ' の勝利！🎉';
    }

    /**
     * Show draw status
     */
    showDrawStatus() {
        if (!this.statusElement || !this.textElement || !this.markerElement) return;

        // Hide marker for draw
        this.markerElement.style.display = 'none';

        // Remove player-specific styling
        this.statusElement.classList.remove('player-x-turn', 'player-o-turn', 'victory');

        // Show draw message
        this.textElement.textContent = '引き分け！';
    }

    /**
     * Show preview confirmation message
     * @param {string} currentPlayer - Current player
     */
    showPreviewConfirmation(currentPlayer) {
        if (!this.statusElement || !this.markerElement || !this.textElement) return;

        // Update marker
        this.markerElement.className = currentPlayer === 'X' ? 'player-x' : 'player-o';
        this.markerElement.style.display = 'inline-block';

        // Update status
        this.statusElement.classList.remove('victory');
        this.statusElement.classList.remove('player-x-turn', 'player-o-turn');
        this.statusElement.classList.add(
            currentPlayer === 'X' ? 'player-x-turn' : 'player-o-turn'
        );

        // Show confirmation message
        this.textElement.textContent = ' もう一度クリックで確定';
    }

    /**
     * Update version display
     */
    updateVersion() {
        if (this.versionElement) {
            this.versionElement.textContent = `v${VERSION}`;
        }
    }

    /**
     * Get DOM element references (for testing)
     * @returns {Object} DOM elements
     */
    getElements() {
        return {
            status: this.statusElement,
            marker: this.markerElement,
            text: this.textElement,
            version: this.versionElement
        };
    }
}
