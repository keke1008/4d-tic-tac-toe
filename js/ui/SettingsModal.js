/**
 * Manager for settings modal UI and interactions
 * Handles dimension and grid size selection
 */

import { CONFIG } from '../config.js';
import { generateRotationPlanes } from '../mathnd.js';

export class SettingsModal {
    /**
     * Create a settings modal manager
     * @param {Function} onApply - Callback when settings are applied (dimensions, gridSize)
     */
    constructor(onApply) {
        this.onApply = onApply;

        // Get DOM elements
        this.modal = document.getElementById('settings-modal');
        this.dimensionSelect = document.getElementById('dimension-select');
        this.gridsizeSelect = document.getElementById('gridsize-select');
        this.dimensionInfo = document.getElementById('dimension-info');
        this.cellsInfo = document.getElementById('cells-info');
        this.applyBtn = document.getElementById('apply-settings-btn');
        this.cancelBtn = document.getElementById('cancel-settings-btn');

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for modal interactions
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
                const newDimensions = parseInt(this.dimensionSelect.value);
                const newGridSize = parseInt(this.gridsizeSelect.value);

                // Validate settings before applying
                if (!this.validateSettings(newDimensions, newGridSize)) {
                    return;
                }

                this.hide();
                this.onApply(newDimensions, newGridSize);
            });
        }

        // Cancel button
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Close when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }
    }

    /**
     * Show the modal with current settings
     * @param {number} currentDimensions - Current dimension count
     * @param {number} currentGridSize - Current grid size
     */
    show(currentDimensions, currentGridSize) {
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
     * Hide the modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    /**
     * Validate settings before applying
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Grid size
     * @returns {boolean} True if valid
     */
    validateSettings(dimensions, gridSize) {
        // Validate dimensions
        if (!Number.isInteger(dimensions) || dimensions < 2 || dimensions > 8) {
            alert('次元数は2から8の整数である必要があります');
            console.error('SettingsModal: Invalid dimensions', dimensions);
            return false;
        }

        // Validate grid size
        if (!Number.isInteger(gridSize) || gridSize < 2 || gridSize > 6) {
            alert('グリッドサイズは2から6の整数である必要があります');
            console.error('SettingsModal: Invalid grid size', gridSize);
            return false;
        }

        // Check total cell count (performance consideration)
        const totalCells = Math.pow(gridSize, dimensions);
        const maxCells = 10000; // Arbitrary limit for performance

        if (totalCells > maxCells) {
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
     */
    updateGridSizeInfo() {
        if (!this.dimensionSelect || !this.gridsizeSelect || !this.cellsInfo) return;

        const dims = parseInt(this.dimensionSelect.value);
        const gridSize = parseInt(this.gridsizeSelect.value);
        const totalCells = Math.pow(gridSize, dims);

        this.cellsInfo.textContent = `セル数: ${totalCells}個`;
    }
}
