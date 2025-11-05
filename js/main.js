/**
 * Main orchestrator for 4D Tic-Tac-Toe
 * Integrates all components and manages game flow
 */

import { CONFIG } from './config.js';
import { GameBoard } from './game.js';
import { GridRenderer } from './renderer.js';
import { InputController } from './input.js';
import { RotationInitializer } from './game/RotationInitializer.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { UIManager } from './ui/UIManager.js';

class Game {
    constructor() {
        // Initialize components
        const container = document.getElementById('canvas-container');
        this.renderer = new GridRenderer(container);
        this.gameBoard = new GameBoard();
        this.inputController = new InputController(this.renderer.getCanvas());

        // UI managers
        this.uiManager = new UIManager();
        this.settingsModal = new SettingsModal((dims, gridSize) => {
            this.reinitializeGame(dims, gridSize);
        });

        // Game state
        this.autoRotate = true;
        this.rotationSpeed = CONFIG.ROTATION_SPEED;
        this.dimensions = CONFIG.DIMENSIONS || 4;
        this.rotations = RotationInitializer.createRotations(this.dimensions);

        this.setupEventListeners();
        this.updateStatus();
        this.inputController.updateAutoRotateButton(this.autoRotate); // Set initial button state
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

        // Reset game - show settings modal
        this.inputController.addEventListener('reset', () => {
            this.settingsModal.show(this.dimensions, CONFIG.GRID_SIZE);
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

        // Use coordsArray for N-dimensional support
        const coords = cell.coordsArray || [];
        if (coords.length === 0) {
            console.error('Game.handleCellClick: Invalid cell coordinates');
            return;
        }

        const currentPlayer = this.gameBoard.getCurrentPlayer();
        const previewCell = this.renderer.getPreviewCell();

        // Check if this cell is already occupied
        if (this.gameBoard.getMarker(coords)) return;

        // If clicking the already previewed cell → confirm placement
        if (previewCell === cell) {
            // Try to place marker
            if (this.gameBoard.placeMarker(coords)) {
                this.renderer.createMarker(cell, currentPlayer);
                this.renderer.clearPreviewSelection();

                // Check win condition
                if (this.gameBoard.checkWin(coords)) {
                    this.gameBoard.setGameOver(currentPlayer);
                    this.updateStatus(null, true); // Victory!
                } else if (this.gameBoard.isBoardFull()) {
                    this.gameBoard.setGameOver(null);
                    this.updateStatus('引き分け！');
                } else {
                    // Switch player
                    this.gameBoard.switchPlayer();
                    this.updateStatus(); // Normal turn
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
        this.updateStatus(); // Reset to normal turn display
    }

    /**
     * Reinitialize game with new settings
     * @param {number} newDimensions - New dimension count
     * @param {number} newGridSize - New grid size
     */
    reinitializeGame(newDimensions, newGridSize) {
        // Update CONFIG
        CONFIG.DIMENSIONS = newDimensions;
        CONFIG.GRID_SIZE = newGridSize;

        // Store current settings
        this.dimensions = newDimensions;

        // Dispose old renderer
        this.renderer.dispose();

        // Recreate components
        const container = document.getElementById('canvas-container');
        this.renderer = new GridRenderer(container);
        this.gameBoard = new GameBoard();
        this.inputController = new InputController(this.renderer.getCanvas());

        // UI managers are persistent (no need to recreate)

        // Reset game state
        this.autoRotate = true;
        this.rotationSpeed = CONFIG.ROTATION_SPEED;
        this.rotations = RotationInitializer.createRotations(this.dimensions);

        // Reattach event listeners
        this.setupEventListeners();
        this.updateStatus();
        this.inputController.updateAutoRotateButton(this.autoRotate);
    }

    /**
     * Toggle auto-rotation
     */
    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        this.inputController.updateAutoRotateButton(this.autoRotate);
    }

    /**
     * Update status display with player color and marker
     * @param {string} message - Status message (optional)
     * @param {boolean} isVictory - Whether this is a victory message
     */
    updateStatus(message = null, isVictory = false) {
        const currentPlayer = this.gameBoard.getCurrentPlayer();
        this.uiManager.updateStatus(currentPlayer, message, isVictory);
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
