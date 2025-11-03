/**
 * Manager for connection lines between 4D grid cells
 * Handles creation and updates of Three.js line objects
 */

import { CONFIG } from '../config.js';
import { rotate4D, project4Dto3D } from '../math4d.js';

export class ConnectionManager {
    /**
     * Create a connection manager
     * @param {THREE.Scene} scene - Three.js scene to add lines to
     */
    constructor(scene) {
        this.scene = scene;
        this.connectionLines = [];
    }

    /**
     * Create a single connection line
     * @param {Array} pos4d1 - Start position [x, y, z, w]
     * @param {Array} pos4d2 - End position [x, y, z, w]
     * @returns {THREE.Line} Created line object
     */
    createLine(pos4d1, pos4d2) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.15,
            linewidth: CONFIG.CONNECTION_LINE_WIDTH
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { pos4d1, pos4d2 };

        this.scene.add(line);
        this.connectionLines.push(line);

        return line;
    }

    /**
     * Create all connection lines from connection data
     * @param {Array} connections - Array of {pos4d1, pos4d2} objects
     */
    createAllLines(connections) {
        connections.forEach(conn => {
            this.createLine(conn.pos4d1, conn.pos4d2);
        });
    }

    /**
     * Update all connection lines based on current rotation
     * @param {Object} rotations - Rotation angles {xy, xz, xw, yz, yw, zw}
     * @param {Array} cells - Array of cell objects (for determining line colors)
     * @param {Object} hoveredCell - Currently hovered cell (optional)
     * @param {Object} previewCell - Currently previewed cell (optional)
     */
    updateLines(rotations, cells = [], hoveredCell = null, previewCell = null) {
        // Build map of cell positions to cell objects for fast lookup
        const cellMap = new Map();
        cells.forEach(cell => {
            const key = cell.pos4d.join(',');
            cellMap.set(key, cell);
        });

        // Get position keys for hover and preview cells
        const hoveredKey = hoveredCell ? hoveredCell.pos4d.join(',') : null;
        const previewKey = previewCell ? previewCell.pos4d.join(',') : null;

        this.connectionLines.forEach(line => {
            const { pos4d1, pos4d2 } = line.userData;

            // Get cells at both endpoints
            const key1 = pos4d1.join(',');
            const key2 = pos4d2.join(',');
            const cell1 = cellMap.get(key1);
            const cell2 = cellMap.get(key2);

            // Check hover and preview states
            const isHovered1 = key1 === hoveredKey;
            const isHovered2 = key2 === hoveredKey;
            const isPreview1 = key1 === previewKey;
            const isPreview2 = key2 === previewKey;
            const isHovered = isHovered1 || isHovered2;
            const isPreview = isPreview1 || isPreview2;

            // Rotate and project endpoints
            const rotated1 = rotate4D(pos4d1, rotations);
            const rotated2 = rotate4D(pos4d2, rotations);
            const [x1, y1, z1] = project4Dto3D(rotated1);
            const [x2, y2, z2] = project4Dto3D(rotated2);

            // Update line geometry
            const positions = line.geometry.attributes.position.array;
            positions[0] = x1;
            positions[1] = y1;
            positions[2] = z1;
            positions[3] = x2;
            positions[4] = y2;
            positions[5] = z2;
            line.geometry.attributes.position.needsUpdate = true;

            // Determine line color based on endpoint states
            const selected1 = cell1?.isSelected || false;
            const selected2 = cell2?.isSelected || false;
            const player1 = cell1?.player;
            const player2 = cell2?.player;

            // Priority: Selected > Preview > Hover > Unselected
            if (selected1 && selected2) {
                // Both selected
                if (player1 === player2) {
                    // Same player: strong color
                    const color = player1 === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
                    line.material.color.setHex(color);
                    line.material.opacity = CONFIG.SAME_PLAYER_GRID_OPACITY;
                } else {
                    // Different players: unselected color
                    line.material.color.setHex(CONFIG.UNSELECTED_GRID_COLOR);
                    line.material.opacity = CONFIG.UNSELECTED_GRID_OPACITY;
                }
            } else if (selected1 || selected2) {
                // One selected: use that player's color
                const player = selected1 ? player1 : player2;
                const color = player === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
                line.material.color.setHex(color);
                line.material.opacity = CONFIG.SELECTED_GRID_OPACITY;
            } else if (isPreview) {
                // Preview state: show preview player color
                const previewPlayer = previewCell?.previewPlayer || 'X';
                const color = previewPlayer === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
                line.material.color.setHex(color);
                line.material.opacity = CONFIG.PREVIEW_GRID_OPACITY;
            } else if (isHovered) {
                // Hover state: slightly brighter grid
                line.material.color.setHex(CONFIG.UNSELECTED_GRID_COLOR);
                line.material.opacity = CONFIG.HOVER_GRID_OPACITY;
            } else {
                // Both unselected: unified grid color
                line.material.color.setHex(CONFIG.UNSELECTED_GRID_COLOR);
                line.material.opacity = CONFIG.UNSELECTED_GRID_OPACITY;
            }
        });
    }

    /**
     * Get all connection line objects
     * @returns {Array<THREE.Line>} Array of line objects
     */
    getLines() {
        return this.connectionLines;
    }

    /**
     * Clear all connection lines from scene
     */
    clear() {
        this.connectionLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.connectionLines = [];
    }
}
