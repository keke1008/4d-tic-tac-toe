/**
 * Main orchestrator for 4D Tic-Tac-Toe (New Architecture)
 * Integrates Infrastructure, Domain, and Application layers
 */

import { StateStore } from './infrastructure/state/StateStore.js';
import { EventBus } from './infrastructure/events/EventBus.js';
import { rootReducer, initialState } from './infrastructure/state/reducers.js';
import { GameService } from './application/services/GameService.js';

// Legacy components (to be refactored in Phase 4)
import { GridRenderer } from './renderer.js';
import { InputController } from './input.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { UIManager } from './ui/UIManager.js';
import { RotationInitializer } from './game/RotationInitializer.js';

/**
 * Main Game Application
 */
class Game {
    constructor() {
        // === Core Architecture (Phase 1-3) ===
        this.store = new StateStore(initialState, rootReducer);
        this.eventBus = new EventBus();
        this.gameService = new GameService(this.store, this.eventBus);

        // === Legacy Components ===
        const container = document.getElementById('canvas-container');
        this.renderer = new GridRenderer(container);
        this.inputController = new InputController(this.renderer.getCanvas());
        this.uiManager = new UIManager();
        this.settingsModal = new SettingsModal((dims, gridSize) => {
            this.handleSettingsChange(dims, gridSize);
        });

        // Initialize rotations based on state
        const state = this.store.getState();
        this.rotations = RotationInitializer.createRotations(state.settings.dimensions);

        // === Setup ===
        this.setupStateSubscription();
        this.setupEventListeners();
        this.setupLegacyIntegration();

        // Initial sync
        this.syncStateToRenderer();
        this.updateStatus();
        this.animate();
    }

    /**
     * Subscribe to state changes and update UI
     */
    setupStateSubscription() {
        this.store.subscribe((state) => {
            this.onStateChange(state);
        });
    }

    /**
     * Handle state changes from store
     */
    onStateChange(state) {
        // Update UI status
        this.updateStatus();

        // Sync visual state to renderer
        if (state.visual.previewCell !== this._lastPreviewCell) {
            this._lastPreviewCell = state.visual.previewCell;
            if (state.visual.previewCell) {
                const cell = this.renderer.getCellByCoords(state.visual.previewCell);
                if (cell) {
                    this.renderer.setPreviewSelection(cell);
                }
            } else {
                this.renderer.clearPreviewSelection();
            }
        }

        // Update auto-rotate button
        if (state.visual.autoRotate !== this._lastAutoRotate) {
            this._lastAutoRotate = state.visual.autoRotate;
            this.inputController.updateAutoRotateButton(state.visual.autoRotate);
        }
    }

    /**
     * Setup event bus listeners
     */
    setupEventListeners() {
        // Game events
        this.eventBus.on('game:markerPlaced', ({ position, player }) => {
            const cell = this.renderer.getCellByCoords(position);
            if (cell) {
                this.renderer.createMarker(cell, player);
            }
        });

        this.eventBus.on('game:reset', () => {
            this.reinitializeGame();
        });

        this.eventBus.on('settings:updated', ({ settings }) => {
            this.rotations = RotationInitializer.createRotations(settings.dimensions);
        });

        // Input controller events
        this.inputController.addEventListener('rotate', (e) => {
            const { axis, delta } = e.detail;
            this.gameService.updateRotation(axis, delta);
            this.rotations[axis] += delta;
        });

        this.inputController.addEventListener('cellClick', (e) => {
            this.handleCellClick(e.detail.mouseX, e.detail.mouseY);
        });

        this.inputController.addEventListener('reset', () => {
            const state = this.store.getState();
            this.settingsModal.show(state.settings.dimensions, state.settings.gridSize);
        });

        this.inputController.addEventListener('toggleAutoRotate', () => {
            this.gameService.toggleAutoRotate();
        });

        this.inputController.addEventListener('cameraPinch', (e) => {
            this.renderer.adjustCameraDistance(e.detail.delta);
        });

        this.inputController.addEventListener('cameraPan', (e) => {
            this.renderer.panCamera(e.detail.deltaX, e.detail.deltaY);
        });

        // Undo button
        document.getElementById('undo-button')?.addEventListener('click', () => {
            this.handleUndo();
        });
    }

    /**
     * Setup legacy integration (bridge old and new)
     */
    setupLegacyIntegration() {
        // Store last values to detect changes
        this._lastPreviewCell = null;
        this._lastAutoRotate = true;
    }

    /**
     * Handle cell click
     */
    handleCellClick(mouseX, mouseY) {
        const state = this.store.getState();

        // Don't allow moves when game is over
        if (state.game.gamePhase !== 'playing') return;

        const cell = this.renderer.getCellAtMouse(mouseX, mouseY);
        if (!cell) return;

        const coords = cell.coordsArray;

        // Use GameService for game logic
        this.gameService.handleCellClick(coords);
    }

    /**
     * Handle undo button
     */
    handleUndo() {
        const state = this.store.getState();

        if (!this.gameService.canUndo()) return;

        // Get the last move before undo
        const lastMove = state.game.moveHistory[state.game.moveHistory.length - 1];

        // Undo in game service
        this.gameService.undo();

        // Remove marker from renderer
        if (lastMove) {
            const cell = this.renderer.getCellByCoords(lastMove.position);
            if (cell) {
                this.renderer.removeMarker(cell);
            }
        }

        this.updateStatus();
    }

    /**
     * Handle settings change
     */
    handleSettingsChange(dimensions, gridSize) {
        this.gameService.updateSettings({ dimensions, gridSize });
        this.reinitializeGame();
    }

    /**
     * Reinitialize game with current settings
     */
    reinitializeGame() {
        const state = this.store.getState();

        // Clear renderer
        this.renderer.clearAllMarkers();
        this.renderer.clearPreviewSelection();

        // Recreate grid with new dimensions
        this.renderer.recreateGrid(state.settings.dimensions, state.settings.gridSize);

        // Reset rotations
        this.rotations = RotationInitializer.createRotations(state.settings.dimensions);

        // Reset game through service
        this.gameService.resetGame();

        // Update UI
        this.updateStatus();
    }

    /**
     * Sync current state to renderer
     */
    syncStateToRenderer() {
        const state = this.store.getState();

        // Sync all placed markers
        state.game.moveHistory.forEach(move => {
            const cell = this.renderer.getCellByCoords(move.position);
            if (cell) {
                this.renderer.createMarker(cell, move.player);
            }
        });
    }

    /**
     * Update status display
     */
    updateStatus() {
        const state = this.store.getState();
        let status;

        if (state.game.gamePhase === 'won') {
            status = `プレイヤー ${state.game.winner} の勝利！`;
            this.uiManager.showVictoryStatus(status);
        } else if (state.game.gamePhase === 'draw') {
            status = '引き分け！';
            this.uiManager.showVictoryStatus(status);
        } else {
            status = `プレイヤー ${state.game.currentPlayer} のターン`;
            this.uiManager.updateStatus(status);
        }

        // Update undo button state
        const undoButton = document.getElementById('undo-button');
        if (undoButton) {
            undoButton.disabled = !this.gameService.canUndo();
        }
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const state = this.store.getState();

        // Auto-rotate if enabled
        if (state.visual.autoRotate) {
            const rotationSpeed = 0.005;
            Object.keys(this.rotations).forEach(axis => {
                this.rotations[axis] += rotationSpeed;
            });
        }

        // Render scene
        this.renderer.render(this.rotations);
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.game = new Game();
    });
} else {
    window.game = new Game();
}

export { Game };
