/**
 * Settings Modal for Presentation Layer (Phase 4)
 * Manages settings modal UI with state integration
 * Pure view layer - dispatches actions instead of callbacks
 */

import { CONFIG } from '../../config.js';
import { generateRotationPlanes } from '../../mathnd.js';
import { Actions } from '../../infrastructure/state/actions.js';

/**
 * SettingsModal - manages settings modal UI
 */
export class SettingsModal {
    /**
     * Create settings modal manager
     * @param {StateStore} stateStore - State store instance (optional for backward compatibility)
     * @param {Function} onApply - Legacy callback (optional, for backward compatibility)
     */
    constructor(stateStore = null, onApply = null) {
        // State store (new architecture)
        this.store = stateStore;
        this.onApply = onApply; // Legacy callback for backward compatibility

        // Get DOM elements
        this.modal = document.getElementById('settings-modal');
        this.dimensionSelect = document.getElementById('dimension-select');
        this.gridsizeSelect = document.getElementById('gridsize-select');
        this.dimensionInfo = document.getElementById('dimension-info');
        this.cellsInfo = document.getElementById('cells-info');
        this.applyBtn = document.getElementById('apply-settings-btn');
        this.cancelBtn = document.getElementById('cancel-settings-btn');

        this.setupEventListeners();

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
        // Update modal visibility based on UI state
        if (state.ui && state.ui.settingsModalOpen) {
            this.showModal(state.settings.dimensions, state.settings.gridSize);
        } else {
            this.hideModal();
        }
    }

    /**
     * Setup event listeners for modal interactions
     * @private
     */
    setupEventListeners() {
        // Update info when dimension changes
        if (this.dimensionSelect) {
            this.dimensionSelect.addEventListener('change', () => {
                this.updateDimensionInfo();
                this.updateGridSizeInfo();
            });
        }

        // Update info when grid size changes
        if (this.gridsizeSelect) {
            this.gridsizeSelect.addEventListener('change', () => {
                this.updateGridSizeInfo();
            });
        }

        // Apply settings
        if (this.applyBtn) {
            this.applyBtn.addEventListener('click', () => {
                this.handleApply();
            });
        }

        // Cancel button
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                this.handleCancel();
            });
        }

        // Close when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.handleCancel();
                }
            });
        }
    }

    /**
     * Handle apply button click
     * @private
     */
    handleApply() {
        const newDimensions = parseInt(this.dimensionSelect.value);
        const newGridSize = parseInt(this.gridsizeSelect.value);

        // Validate settings before applying
        if (!this.validateSettings(newDimensions, newGridSize)) {
            return;
        }

        // Close modal first
        this.hideModal();

        // Use new architecture if store available
        if (this.store) {
            // Dispatch action to update settings
            this.store.dispatch(Actions.updateSettings({
                dimensions: newDimensions,
                gridSize: newGridSize
            }));
            // Close modal via state
            this.store.dispatch(Actions.setSettingsModalOpen(false));
        }

        // Always call legacy callback if provided (needed for grid recreation)
        if (this.onApply) {
            this.onApply(newDimensions, newGridSize);
        }
    }

    /**
     * Handle cancel button click
     * @private
     */
    handleCancel() {
        if (this.store) {
            this.store.dispatch(Actions.setSettingsModalOpen(false));
        } else {
            this.hideModal();
        }
    }

    /**
     * Show the modal with current settings (new architecture)
     * @param {number} currentDimensions - Current dimension count
     * @param {number} currentGridSize - Current grid size
     * @private
     */
    showModal(currentDimensions, currentGridSize) {
        if (!this.modal) return;

        // Set current values
        if (this.dimensionSelect) {
            this.dimensionSelect.value = currentDimensions.toString();
        }
        if (this.gridsizeSelect) {
            this.gridsizeSelect.value = currentGridSize.toString();
        }

        // Update info displays
        this.updateDimensionInfo();
        this.updateGridSizeInfo();

        // Show modal
        this.modal.classList.add('show');
    }

    /**
     * Hide the modal (new architecture)
     * @private
     */
    hideModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    /**
     * Show the modal (legacy public API for backward compatibility)
     * @param {number} currentDimensions - Current dimension count
     * @param {number} currentGridSize - Current grid size
     */
    show(currentDimensions, currentGridSize) {
        this.showModal(currentDimensions, currentGridSize);
    }

    /**
     * Hide the modal (legacy public API for backward compatibility)
     */
    hide() {
        this.hideModal();
    }

    /**
     * Validate settings before applying
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Grid size
     * @returns {boolean} True if valid
     * @private
     */
    validateSettings(dimensions, gridSize) {
        // Validate dimensions
        if (!Number.isInteger(dimensions) || dimensions < CONFIG.MIN_DIMENSIONS || dimensions > CONFIG.MAX_DIMENSIONS) {
            alert(`次元数は${CONFIG.MIN_DIMENSIONS}から${CONFIG.MAX_DIMENSIONS}の整数である必要があります`);
            console.error('SettingsModal: Invalid dimensions', dimensions);
            return false;
        }

        // Validate grid size
        if (!Number.isInteger(gridSize) || gridSize < CONFIG.MIN_GRID_SIZE || gridSize > CONFIG.MAX_GRID_SIZE) {
            alert(`グリッドサイズは${CONFIG.MIN_GRID_SIZE}から${CONFIG.MAX_GRID_SIZE}の整数である必要があります`);
            console.error('SettingsModal: Invalid grid size', gridSize);
            return false;
        }

        // Check total cell count (performance consideration)
        const totalCells = Math.pow(gridSize, dimensions);

        if (totalCells > CONFIG.MAX_CELLS_WARNING_THRESHOLD) {
            const proceed = confirm(
                `警告: セル数が${totalCells}個になります。\n` +
                `パフォーマンスに影響する可能性があります。\n` +
                `続行しますか？`
            );
            if (!proceed) {
                return false;
            }
        }

        return true;
    }

    /**
     * Update dimension info display (rotation plane count)
     * @private
     */
    updateDimensionInfo() {
        if (!this.dimensionSelect || !this.dimensionInfo) return;

        const dims = parseInt(this.dimensionSelect.value);
        const rotationPlanes = generateRotationPlanes(dims);
        const planeCount = rotationPlanes.length;

        this.dimensionInfo.textContent = `回転平面: ${planeCount}個`;
    }

    /**
     * Update grid size info display (total cell count)
     * @private
     */
    updateGridSizeInfo() {
        if (!this.dimensionSelect || !this.gridsizeSelect || !this.cellsInfo) return;

        const dims = parseInt(this.dimensionSelect.value);
        const gridSize = parseInt(this.gridsizeSelect.value);
        const totalCells = Math.pow(gridSize, dims);

        this.cellsInfo.textContent = `セル数: ${totalCells}個`;
    }

    /**
     * Get DOM element references (for testing)
     * @returns {Object} DOM elements
     */
    getElements() {
        return {
            modal: this.modal,
            dimensionSelect: this.dimensionSelect,
            gridsizeSelect: this.gridsizeSelect,
            dimensionInfo: this.dimensionInfo,
            cellsInfo: this.cellsInfo,
            applyBtn: this.applyBtn,
            cancelBtn: this.cancelBtn
        };
    }
}
