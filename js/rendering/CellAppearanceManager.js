/**
 * Manages cell visual appearance (color, opacity, line width)
 * Handles different states: unselected, hovered, preview, selected
 */

import { CONFIG } from '../config.js';
import { getHueFromW } from '../mathnd.js';

export class CellAppearanceManager {
    /**
     * Update cell appearance based on its state
     * @param {Object} cell - Cell object with wireframe material
     * @param {number} w - W coordinate (for depth-based coloring)
     * @param {boolean} isHovered - Whether cell is hovered
     * @param {boolean} isPreview - Whether cell is in preview state
     * @param {string} currentPlayer - Current player ('X' or 'O'), used for preview color
     * @param {boolean} hasMarker - Whether cell has a marker placed
     * @param {string|null} markerPlayer - Player who placed marker ('X' or 'O'), or null
     */
    updateCellAppearance(cell, w, isHovered, isPreview, currentPlayer = 'X', hasMarker = false, markerPlayer = null) {
        if (hasMarker) {
            // Fully selected: player color with high opacity
            this.applySelectedAppearance(cell, markerPlayer);
        } else if (isPreview) {
            // Preview selection: show player color at reduced opacity
            this.applyPreviewAppearance(cell, currentPlayer);
        } else {
            // Unselected: W-based color for depth visualization
            this.applyUnselectedAppearance(cell, w, isHovered);
        }
    }

    /**
     * Apply appearance for selected cells
     * @param {Object} cell - Cell object
     * @param {string} player - Player who placed marker ('X' or 'O')
     */
    applySelectedAppearance(cell, player) {
        const color = player === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;

        cell.wireframe.material.color.setHex(color);
        cell.wireframe.material.opacity = CONFIG.SELECTED_CELL_OPACITY;
        cell.wireframe.material.linewidth = CONFIG.SELECTED_CELL_LINE_WIDTH;
    }

    /**
     * Apply appearance for preview cells
     * @param {Object} cell - Cell object
     * @param {string} currentPlayer - Current player ('X' or 'O')
     */
    applyPreviewAppearance(cell, currentPlayer = 'X') {
        const color = currentPlayer === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;

        cell.wireframe.material.color.setHex(color);
        cell.wireframe.material.opacity = CONFIG.PREVIEW_CELL_OPACITY;
        cell.wireframe.material.linewidth = CONFIG.CELL_LINE_WIDTH;
    }

    /**
     * Apply appearance for unselected cells
     * @param {Object} cell - Cell object
     * @param {number} w - W coordinate
     * @param {boolean} isHovered - Whether cell is hovered
     */
    applyUnselectedAppearance(cell, w, isHovered) {
        // W-based color for depth visualization
        const hue = getHueFromW(w);
        const wFactor = (w + 2) / 4; // Normalize W to 0-1 range

        let lightness = CONFIG.UNSELECTED_CELL_LIGHTNESS;
        let opacity = CONFIG.UNSELECTED_CELL_OPACITY_MIN +
                      wFactor * CONFIG.UNSELECTED_CELL_OPACITY_RANGE;

        // Boost lightness and opacity when hovered
        if (isHovered) {
            lightness += CONFIG.HOVER_CELL_LIGHTNESS_BOOST;
            opacity += CONFIG.HOVER_CELL_OPACITY_BOOST;
        }

        cell.wireframe.material.color.setHSL(
            hue,
            CONFIG.UNSELECTED_CELL_SATURATION,
            lightness
        );
        cell.wireframe.material.opacity = opacity;
        cell.wireframe.material.linewidth = CONFIG.CELL_LINE_WIDTH;
    }

    /**
     * Reset cell to unselected appearance
     * @param {Object} cell - Cell object
     * @param {number} w - W coordinate
     */
    resetCellAppearance(cell, w) {
        this.applyUnselectedAppearance(cell, w, false);
    }
}
