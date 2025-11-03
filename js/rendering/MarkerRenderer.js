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
     * @param {Object} cell - Cell object with group property
     * @param {string} player - 'X' or 'O'
     * @returns {THREE.Sprite} Created marker sprite
     */
    createMarker(cell, player) {
        // Create canvas texture for marker
        const canvas = document.createElement('canvas');
        canvas.width = CONFIG.MARKER_CANVAS_SIZE;
        canvas.height = CONFIG.MARKER_CANVAS_SIZE;
        const ctx = canvas.getContext('2d');

        // Draw player symbol
        ctx.fillStyle = player === 'X' ? '#ff00ff' : '#00ffff';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player, 64, 64);

        // Create sprite with texture
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(CONFIG.MARKER_SCALE, CONFIG.MARKER_SCALE, 1);

        // Add to cell
        cell.group.add(sprite);
        cell.marker = sprite;
        cell.isSelected = true; // Mark cell as selected
        cell.player = player;    // Track which player selected this cell

        // Update cell wireframe appearance
        this.updateCellAppearance(cell, player);

        return sprite;
    }

    /**
     * Update cell wireframe appearance when marker is placed
     * Makes the cell bright and vibrant
     * @param {Object} cell - Cell object
     * @param {string} player - 'X' or 'O'
     */
    updateCellAppearance(cell, player) {
        const color = player === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
        cell.wireframe.material.color.setHex(color);
        cell.wireframe.material.opacity = 0.8; // Brighter opacity for selected cells
    }

    /**
     * Clear marker from a single cell
     * @param {Object} cell - Cell object
     */
    clearMarkerFromCell(cell) {
        if (cell.marker) {
            cell.group.remove(cell.marker);
            cell.marker.material.map.dispose();
            cell.marker.material.dispose();
            cell.marker = null;
            cell.isSelected = false; // Mark cell as unselected
            cell.player = null;      // Clear player tracking
        }

        // Color will be reset to W-based color on next updateCellPositions() call
        // Set a temporary neutral color until next frame
        cell.wireframe.material.color.setHex(0x4a4a6a);
        cell.wireframe.material.opacity = 0.25;
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
        return cell.marker !== null;
    }

    /**
     * Get marker player type from cell
     * @param {Object} cell - Cell object
     * @returns {string|null} 'X', 'O', or null if no marker
     */
    getMarkerPlayer(cell) {
        if (!cell.marker) return null;

        // Determine player from color
        const color = cell.wireframe.material.color.getHex();
        if (color === CONFIG.PLAYER_X_COLOR) return 'X';
        if (color === CONFIG.PLAYER_O_COLOR) return 'O';
        return null;
    }
}
