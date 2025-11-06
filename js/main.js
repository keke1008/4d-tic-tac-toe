/**
 * Main orchestrator for 4D Tic-Tac-Toe (New Architecture)
 * Integrates Infrastructure, Domain, and Application layers
 */

import { StateStore } from './infrastructure/state/StateStore.js';
import { EventBus } from './infrastructure/events/EventBus.js';
import { rootReducer, initialState } from './infrastructure/state/reducers.js';
import { GameService } from './application/services/GameService.js';

// Presentation layer (Phase 4)
import { UIManager } from './presentation/ui/UIManager.js';
import { SettingsModal } from './presentation/ui/SettingsModal.js';
import { InputController } from './presentation/input/InputController.js';

// Legacy components (partial Phase 4)
import { GridRenderer } from './renderer.js';
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

        // === Presentation Layer ===
        this.uiManager = new UIManager(this.store);

        // === Legacy Components ===
        const container = document.getElementById('canvas-container');
        this.renderer = new GridRenderer(container);

        // Input controller with new architecture integration
        this.inputController = new InputController(
            this.renderer.getCanvas(),
            this.eventBus,
            this.store
        );

        // Settings modal with both new architecture and legacy callback for backward compatibility
        this.settingsModal = new SettingsModal(this.store, (dims, gridSize) => {
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
                    // Pass current player to setPreviewSelection for correct preview color
                    this.renderer.setPreviewSelection(cell, state.game.currentPlayer);
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
        // Game events - listen to completion notifications (past tense)
        // These listeners perform side effects only (rendering, UI updates)
        // They NEVER call Commands that could create circular dependencies

        this.eventBus.on('game:markerPlaced', ({ position, player }) => {
            const cell = this.renderer.getCellByCoords(position);
            if (cell) {
                this.renderer.createMarker(cell, player);
            }
        });

        this.eventBus.on('game:stateReset', () => {
            // Clear all markers from the grid
            this.renderer.clearMarkers();
            // Update UI status
            this.updateStatus();
        });

        this.eventBus.on('game:moveUndone', () => {
            // Move removal is handled in handleUndo()
            this.updateStatus();
        });

        this.eventBus.on('game:moveRedone', () => {
            // Move addition is handled in handleRedo()
            this.updateStatus();
        });

        this.eventBus.on('settings:changed', ({ newSettings }) => {
            // Heavy operation: recreate grid with new settings
            this.renderer.recreateGrid(
                newSettings.dimensions,
                newSettings.gridSize
            );
            // Update rotation axes for new dimensions
            this.rotations = RotationInitializer.createRotations(newSettings.dimensions);
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

        // Redo button
        document.getElementById('redo-button')?.addEventListener('click', () => {
            this.handleRedo();
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
     * Handle redo button
     */
    handleRedo() {
        const state = this.store.getState();

        if (!this.gameService.canRedo()) return;

        // Get the move to redo
        const redoStack = state.game.redoStack || [];
        const moveToRedo = redoStack[redoStack.length - 1];

        // Redo in game service
        this.gameService.redo();

        // Add marker back to renderer
        if (moveToRedo) {
            const cell = this.renderer.getCellByCoords(moveToRedo.position);
            if (cell) {
                this.renderer.createMarker(cell, moveToRedo.player);
            }
        }

        this.updateStatus();
    }

    /**
     * Handle settings change (called from SettingsModal)
     * This orchestrates the full settings change flow:
     * 1. Update settings → triggers 'settings:changed' event → grid recreation
     * 2. Reset game state → triggers 'game:stateReset' event → UI update
     */
    handleSettingsChange(dimensions, gridSize) {
        // Update settings (triggers 'settings:changed' which recreates grid)
        this.gameService.updateSettings({ dimensions, gridSize });

        // Reset game state (triggers 'game:stateReset' which updates UI)
        this.gameService.resetGameState();

        // Note: Grid recreation and UI updates are handled by event listeners
        // This prevents circular dependencies and keeps the flow one-directional
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

        if (state.game.gamePhase === 'won') {
            this.uiManager.showVictoryStatus(`プレイヤー ${state.game.winner} の勝利！`);
        } else if (state.game.gamePhase === 'draw') {
            this.uiManager.showDrawStatus();
        } else {
            // Pass currentPlayer (not full message) to updateStatus
            this.uiManager.updateStatus(state.game.currentPlayer);
        }

        // Update undo/redo button states
        const undoButton = document.getElementById('undo-button');
        if (undoButton) {
            undoButton.disabled = !this.gameService.canUndo();
        }

        const redoButton = document.getElementById('redo-button');
        if (redoButton) {
            redoButton.disabled = !this.gameService.canRedo();
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

        // Update renderer rotations and render
        this.renderer.setRotations(this.rotations);
        this.renderer.render();
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
