/**
 * Manager for UI updates (status display, version, etc.)
 * Handles DOM manipulation for game state display
 */

import { VERSION } from '../config.js';

export class UIManager {
    constructor() {
        // Get DOM elements
        this.statusElement = document.getElementById('status');
        this.markerElement = document.getElementById('player-marker');
        this.textElement = document.getElementById('status-text');
        this.versionElement = document.getElementById('version');

        this.updateVersion();
    }

    /**
     * Update status display with player color and marker
     * @param {string} currentPlayer - Current player ('X' or 'O')
     * @param {string} message - Status message (optional)
     * @param {boolean} isVictory - Whether this is a victory message
     */
    updateStatus(currentPlayer, message = null, isVictory = false) {
        if (!this.statusElement || !this.markerElement || !this.textElement) return;

        // Update player marker color
        this.markerElement.className = currentPlayer === 'X' ? 'player-x' : 'player-o';

        // Update status border color to match current player
        this.statusElement.classList.remove('player-x-turn', 'player-o-turn');
        if (message !== '引き分け！') {
            this.statusElement.classList.add(
                currentPlayer === 'X' ? 'player-x-turn' : 'player-o-turn'
            );
        }

        if (isVictory) {
            // Victory display
            this.statusElement.classList.add('victory');
            this.textElement.textContent = ' の勝利！🎉';
            this.markerElement.style.display = 'inline-block';
        } else if (message === '引き分け！') {
            // Draw display
            this.statusElement.classList.remove('victory');
            this.markerElement.style.display = 'none';
            this.textElement.textContent = '引き分け！';
        } else if (message && message.includes('もう一度クリックで確定')) {
            // Preview confirmation message
            this.statusElement.classList.remove('victory');
            this.markerElement.style.display = 'inline-block';
            this.textElement.textContent = ' もう一度クリックで確定';
        } else if (message) {
            // Custom message
            this.statusElement.classList.remove('victory');
            this.markerElement.style.display = 'inline-block';
            this.textElement.textContent = message;
        } else {
            // Normal turn display
            this.statusElement.classList.remove('victory');
            this.markerElement.style.display = 'inline-block';
            this.textElement.textContent = ' の番です';
        }
    }

    /**
     * Update version display
     */
    updateVersion() {
        if (this.versionElement) {
            this.versionElement.textContent = `v${VERSION}`;
        }
    }
}
