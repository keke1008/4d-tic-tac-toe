/**
 * Main orchestrator for 4D Tic-Tac-Toe
 * Integrates all components and manages game flow
 */

import { CONFIG, VERSION } from './config.js';
import { GameBoard } from './game.js';
import { GridRenderer } from './renderer.js';
import { InputController } from './input.js';
import { generateRotationPlanes, getRotationPlaneName } from './mathnd.js';

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
        this.dimensions = CONFIG.DIMENSIONS || 4;
        this.rotations = this.initializeRotations();

        this.setupEventListeners();
        this.updateStatus();
        this.updateVersion();
        this.inputController.updateAutoRotateButton(this.autoRotate); // Set initial button state
        this.animate();
    }

    /**
     * Initialize rotation angles for all rotation planes
     * @returns {Object} Rotation object with all planes set to 0
     */
    initializeRotations() {
        const rotations = {};
        const planes = generateRotationPlanes(this.dimensions);

        for (const [axis1, axis2] of planes) {
            const planeName = getRotationPlaneName(axis1, axis2);
            rotations[planeName] = 0;
        }

        return rotations;
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
            this.showSettingsModal();
        });

        // Setup modal event listeners
        this.setupModalListeners();

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
     * Show settings modal
     */
    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        // Set current values
        const dimensionSelect = document.getElementById('dimension-select');
        const gridsizeSelect = document.getElementById('gridsize-select');

        if (dimensionSelect) {
            dimensionSelect.value = this.dimensions.toString();
        }
        if (gridsizeSelect) {
            gridsizeSelect.value = CONFIG.GRID_SIZE.toString();
        }

        // Update info displays
        this.updateDimensionInfo();
        this.updateGridSizeInfo();

        // Show modal
        modal.classList.add('show');
    }

    /**
     * Hide settings modal
     */
    hideSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Setup modal event listeners
     */
    setupModalListeners() {
        const modal = document.getElementById('settings-modal');
        const dimensionSelect = document.getElementById('dimension-select');
        const gridsizeSelect = document.getElementById('gridsize-select');
        const applyBtn = document.getElementById('apply-settings-btn');
        const cancelBtn = document.getElementById('cancel-settings-btn');

        // Update info when dimension changes
        if (dimensionSelect) {
            dimensionSelect.addEventListener('change', () => {
                this.updateDimensionInfo();
                this.updateGridSizeInfo(); // Cell count depends on both
            });
        }

        // Update info when grid size changes
        if (gridsizeSelect) {
            gridsizeSelect.addEventListener('change', () => {
                this.updateGridSizeInfo();
            });
        }

        // Apply settings and restart game
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const newDimensions = parseInt(dimensionSelect.value);
                const newGridSize = parseInt(gridsizeSelect.value);

                this.hideSettingsModal();
                this.reinitializeGame(newDimensions, newGridSize);
            });
        }

        // Cancel - just close modal
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideSettingsModal();
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideSettingsModal();
                }
            });
        }
    }

    /**
     * Update dimension info display
     */
    updateDimensionInfo() {
        const dimensionSelect = document.getElementById('dimension-select');
        const dimensionInfo = document.getElementById('dimension-info');

        if (!dimensionSelect || !dimensionInfo) return;

        const dims = parseInt(dimensionSelect.value);
        const rotationPlanes = generateRotationPlanes(dims);
        const planeCount = rotationPlanes.length;

        dimensionInfo.textContent = `回転平面: ${planeCount}個`;
    }

    /**
     * Update grid size info display
     */
    updateGridSizeInfo() {
        const dimensionSelect = document.getElementById('dimension-select');
        const gridsizeSelect = document.getElementById('gridsize-select');
        const cellsInfo = document.getElementById('cells-info');

        if (!dimensionSelect || !gridsizeSelect || !cellsInfo) return;

        const dims = parseInt(dimensionSelect.value);
        const gridSize = parseInt(gridsizeSelect.value);
        const totalCells = Math.pow(gridSize, dims);

        cellsInfo.textContent = `セル数: ${totalCells}個`;
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

        // Reset game state
        this.autoRotate = true;
        this.rotationSpeed = CONFIG.ROTATION_SPEED;
        this.rotations = this.initializeRotations();

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
        const statusElement = document.getElementById('status');
        const markerElement = document.getElementById('player-marker');
        const textElement = document.getElementById('status-text');

        if (!statusElement || !markerElement || !textElement) return;

        const currentPlayer = this.gameBoard.getCurrentPlayer();

        // Update player marker color
        markerElement.className = currentPlayer === 'X' ? 'player-x' : 'player-o';

        // Update status border color to match current player (including victory)
        statusElement.classList.remove('player-x-turn', 'player-o-turn');
        if (message !== '引き分け！') {
            statusElement.classList.add(currentPlayer === 'X' ? 'player-x-turn' : 'player-o-turn');
        }

        if (isVictory) {
            // Victory display
            statusElement.classList.add('victory');
            textElement.textContent = ' の勝利！🎉';
        } else if (message === '引き分け！') {
            // Draw display
            statusElement.classList.remove('victory');
            markerElement.style.display = 'none';
            textElement.textContent = '引き分け！';
        } else if (message && message.includes('もう一度クリックで確定')) {
            // Preview confirmation message
            statusElement.classList.remove('victory');
            markerElement.style.display = 'inline-block';
            textElement.textContent = ' もう一度クリックで確定';
        } else {
            // Normal turn display
            statusElement.classList.remove('victory');
            markerElement.style.display = 'inline-block';
            textElement.textContent = ' の番です';
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
