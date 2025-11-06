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
        this.renderer = new GridRenderer(container, this.store);

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

        // Update auto-rotate button
        if (state.visual.autoRotate !== this._lastAutoRotate) {
            this._lastAutoRotate = state.visual.autoRotate;
            this.inputController.updateAutoRotateButton(state.visual.autoRotate);
        }
    }

    /**
     * Setup event bus listeners
     *
     * IMPORTANT: Event listeners perform SIDE EFFECTS ONLY (rendering, UI updates)
     * They NEVER call Commands to prevent circular dependencies
     *
     * @see EVENT_RESPONSIBILITIES.md for detailed event specifications
     */
    setupEventListeners() {
        // ===== Game Events =====

        /**
         * Event: game:markerPlaced
         *
         * Precondition (guaranteed by GameService.handleCellClick):
         * - Marker added to moveHistory
         * - currentPlayer switched
         *
         * Responsibility:
         * - Render marker on the grid
         *
         * Postcondition:
         * - Marker visible on renderer at specified position
         */
        this.eventBus.on('game:markerPlaced', ({ position, player }) => {
            const cell = this.renderer.getCellByCoords(position);
            if (cell) {
                this.renderer.createMarker(cell, player);
            }
        });

        /**
         * Event: game:stateReset
         *
         * Precondition (guaranteed by GameService.resetGameState):
         * - moveHistory = []
         * - redoStack = []
         * - currentPlayer = 'X'
         * - winner = null
         * - previewCell = null
         *
         * Responsibility:
         * - Clear all markers from renderer
         * - Update UI status to initial state
         *
         * Postcondition:
         * - All markers cleared from grid
         * - UI shows "Player X's turn"
         */
        this.eventBus.on('game:stateReset', () => {
            // Clear all markers from the grid
            this.renderer.clearMarkers();
            // Update UI status
            this.updateStatus();
        });

        /**
         * Event: game:moveUndone
         *
         * Precondition (guaranteed by GameService.undo):
         * - Last move removed from moveHistory
         * - That move added to redoStack
         * - currentPlayer switched back
         *
         * Responsibility:
         * - Update UI status
         * - NOTE: Marker removal handled by handleUndo() to avoid duplication
         *
         * Postcondition:
         * - UI status updated
         */
        this.eventBus.on('game:moveUndone', () => {
            // Move removal is handled in handleUndo()
            this.updateStatus();
        });

        /**
         * Event: game:moveRedone
         *
         * Precondition (guaranteed by GameService.redo):
         * - Move added back to moveHistory
         * - That move removed from redoStack
         * - currentPlayer switched forward
         *
         * Responsibility:
         * - Update UI status
         * - NOTE: Marker addition handled by handleRedo() to avoid duplication
         *
         * Postcondition:
         * - UI status updated
         */
        this.eventBus.on('game:moveRedone', () => {
            // Move addition is handled in handleRedo()
            this.updateStatus();
        });

        // ===== Settings Events =====

        /**
         * Event: settings:changed
         *
         * Precondition (guaranteed by GameService.updateSettings):
         * - settings.dimensions updated
         * - settings.gridSize updated
         * - RECOMMENDED: moveHistory should be empty (cleared by resetGameState)
         *
         * Responsibility:
         * - Recreate grid with new dimensions/gridSize
         * - Update rotation axes for new dimensions
         *
         * Postcondition:
         * - Grid recreated with new settings
         * - Rotation axes updated
         */
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
     *
     * **Orchestration Type**: Composite operation (multiple Commands in sequence)
     *
     * **Purpose**: Change game settings and restart with clean state
     *
     * **Execution Order** (CRITICAL - do not change):
     * 1. resetGameState()
     *    - Clears moveHistory, redoStack
     *    - Emits 'game:stateReset'
     *    - Listener clears markers from renderer
     *
     * 2. updateSettings({ dimensions, gridSize })
     *    - Updates settings in state
     *    - Emits 'settings:changed'
     *    - Listener recreates grid (now with empty moveHistory)
     *
     * **Why This Order?**
     * - If we call updateSettings() first, grid is recreated while moveHistory
     *   still has old moves, potentially causing markers to appear on new grid
     * - By calling resetGameState() first, we guarantee moveHistory is empty
     *   when grid recreation happens
     *
     * **Precondition**:
     * - User has selected new dimensions/gridSize in SettingsModal
     *
     * **Postcondition**:
     * - Game state reset to initial (no markers, player X's turn)
     * - Grid recreated with new dimensions/gridSize
     * - UI synchronized with new state
     *
     * @param {number} dimensions - New dimension count
     * @param {number} gridSize - New grid size (n-in-a-row)
     *
     * @see EVENT_RESPONSIBILITIES.md section "複合操作フロー"
     */
    handleSettingsChange(dimensions, gridSize) {
        // Step 1: Reset game state FIRST (clears markers and moveHistory)
        // This ensures the new grid is created with clean state
        this.gameService.resetGameState();

        // Step 2: Update settings (triggers 'settings:changed' which recreates grid)
        // At this point, moveHistory is empty, so no markers will be re-applied
        this.gameService.updateSettings({ dimensions, gridSize });

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
