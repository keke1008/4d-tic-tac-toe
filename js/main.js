/**
 * Main orchestrator for 4D Tic-Tac-Toe
 * Integrates all components and manages game flow
 */

import { CONFIG, VERSION } from './config.js';
import { GameBoard } from './game.js';
import { GridRenderer } from './renderer.js';
import { InputController } from './input.js';

class Game {
    constructor() {
        // Initialize components
        const container = document.getElementById('canvas-container');
        this.renderer = new GridRenderer(container);
        this.gameBoard = new GameBoard();
        this.inputController = new InputController(this.renderer.getCanvas());

        // Game state
        this.autoRotate = true;
        this.rotationSpeed = CONFIG.ROTATION_SPEED;
        this.rotations = { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 };

        this.setupEventListeners();
        this.updateStatus();
        this.updateVersion();
        this.animate();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Rotation from input
        this.inputController.addEventListener('rotate', (e) => {
            const { axis, delta } = e.detail;
            this.rotations[axis] += delta;
        });

        // Cell click
        this.inputController.addEventListener('cellClick', (e) => {
            this.handleCellClick(e.detail.mouseX, e.detail.mouseY);
        });

        // Reset game
        this.inputController.addEventListener('reset', () => {
            this.reset();
        });

        // Toggle auto-rotate
        this.inputController.addEventListener('toggleAutoRotate', () => {
            this.toggleAutoRotate();
        });

        // Camera pinch gesture (zoom)
        this.inputController.addEventListener('cameraPinch', (e) => {
            this.renderer.adjustCameraDistance(e.detail.delta);
        });

        // Camera pan gesture (move)
        this.inputController.addEventListener('cameraPan', (e) => {
            this.renderer.panCamera(e.detail.deltaX, e.detail.deltaY);
        });
    }

    /**
     * Handle cell click (two-step process: preview → confirm)
     * @param {number} mouseX - Normalized mouse X
     * @param {number} mouseY - Normalized mouse Y
     */
    handleCellClick(mouseX, mouseY) {
        if (this.gameBoard.isGameOver()) return;

        const cell = this.renderer.getCellAtMouse(mouseX, mouseY);
        if (!cell) return;

        const { x, y, z, w } = cell.coords;
        const currentPlayer = this.gameBoard.getCurrentPlayer();
        const previewCell = this.renderer.getPreviewCell();

        // Check if this cell is already occupied
        if (this.gameBoard.getMarker(x, y, z, w)) return;

        // If clicking the already previewed cell → confirm placement
        if (previewCell === cell) {
            // Try to place marker
            if (this.gameBoard.placeMarker(x, y, z, w)) {
                this.renderer.createMarker(cell, currentPlayer);
                this.renderer.clearPreviewSelection();

                // Check win condition
                if (this.gameBoard.checkWin(x, y, z, w)) {
                    this.gameBoard.setGameOver(currentPlayer);
                    this.updateStatus(`🎉 プレイヤー ${currentPlayer} の勝利！`);
                } else if (this.gameBoard.isBoardFull()) {
                    this.gameBoard.setGameOver(null);
                    this.updateStatus('引き分け！');
                } else {
                    // Switch player
                    this.gameBoard.switchPlayer();
                    this.updateStatus(`プレイヤー ${this.gameBoard.getCurrentPlayer()} の番です`);
                }
            }
        } else {
            // First click or different cell → preview selection
            this.renderer.setPreviewSelection(cell, currentPlayer);
            this.updateStatus(`プレイヤー ${currentPlayer}: もう一度クリックで確定`);
        }
    }

    /**
     * Reset the game
     */
    reset() {
        this.gameBoard.reset();
        this.renderer.clearMarkers();
        this.updateStatus(`プレイヤー ${this.gameBoard.getCurrentPlayer()} の番です`);
    }

    /**
     * Toggle auto-rotation
     */
    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        this.inputController.updateAutoRotateButton(this.autoRotate);
    }

    /**
     * Update status display
     * @param {string} text - Status text
     */
    updateStatus(text) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            if (text) {
                statusElement.textContent = text;
            } else {
                statusElement.textContent = `プレイヤー ${this.gameBoard.getCurrentPlayer()} の番です`;
            }
        }
    }

    /**
     * Update version display
     */
    updateVersion() {
        const versionElement = document.getElementById('version');
        if (versionElement) {
            versionElement.textContent = `v${VERSION}`;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        // Auto-rotation
        if (this.autoRotate) {
            this.rotations.xw += this.rotationSpeed;
            this.rotations.yz += this.rotationSpeed * 0.7;
        }

        // Update renderer
        this.renderer.setRotations(this.rotations);
        this.renderer.render();
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Game();
    });
} else {
    new Game();
}
