/**
 * Renderer for game markers (X and O)
 * Manages sprite creation and marker lifecycle
 */

import { CONFIG } from '../config.js';

export class MarkerRenderer {
    /**
     * Create a marker renderer
     */
    constructor() {
        // No internal state needed, markers are stored on cells
    }

    /**
     * Create a marker (X or O) on a cell
     * Now only changes cell color, no sprite displayed
     * @param {Object} cell - Cell object with group property
     * @param {string} player - 'X' or 'O'
     * @returns {null} No sprite created
     */
    createMarker(cell, player) {
        // Mark cell as selected (no sprite, just color change)
        cell.marker = true; // Set to true instead of sprite object
        cell.isSelected = true; // Mark cell as selected
        cell.player = player;    // Track which player selected this cell

        // Update cell wireframe appearance (color only)
        this.updateCellAppearance(cell, player);

        return null;
    }

    /**
     * Update cell wireframe appearance when marker is placed
     * Makes the cell bright and vibrant with thicker lines
     * @param {Object} cell - Cell object
     * @param {string} player - 'X' or 'O'
     */
    updateCellAppearance(cell, player) {
        const color = player === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
        cell.wireframe.material.color.setHex(color);
        cell.wireframe.material.opacity = 0.8; // Brighter opacity for selected cells
        cell.wireframe.material.linewidth = CONFIG.SELECTED_CELL_LINE_WIDTH; // Thicker lines
    }

    /**
     * Clear marker from a single cell
     * @param {Object} cell - Cell object
     */
    clearMarkerFromCell(cell) {
        if (cell.marker) {
            // No sprite to remove, just clear flags
            cell.marker = false;     // Use boolean consistently
            cell.isSelected = false; // Mark cell as unselected
            cell.player = null;      // Clear player tracking
        }

        // Color will be reset to W-based color on next updateCellPositions() call
        // Set a temporary neutral color until next frame
        cell.wireframe.material.color.setHex(0x4a4a6a);
        cell.wireframe.material.opacity = 0.25;
        cell.wireframe.material.linewidth = CONFIG.CELL_LINE_WIDTH; // Reset line thickness
    }

    /**
     * Clear all markers from all cells
     * @param {Array} cells - Array of cell objects
     */
    clearAllMarkers(cells) {
        cells.forEach(cell => this.clearMarkerFromCell(cell));
    }

    /**
     * Check if cell has a marker
     * @param {Object} cell - Cell object
     * @returns {boolean} True if cell has a marker
     */
    hasMarker(cell) {
        return cell.marker === true;
    }

    /**
     * Get marker player type from cell
     * @param {Object} cell - Cell object
     * @returns {string|null} 'X', 'O', or null if no marker
     */
    getMarkerPlayer(cell) {
        // Return player directly from cell (no sprite to check)
        return cell.player || null;
    }
}
