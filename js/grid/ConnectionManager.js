/**
 * Manager for connection lines between 4D grid cells
 * Handles creation and updates of Three.js line objects
 */

import { CONFIG } from '../config.js';
import { rotate4D, project4Dto3D } from '../mathnd.js';

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
     * @param {Array} posND1 - Start position N-dimensional
     * @param {Array} posND2 - End position N-dimensional
     * @returns {THREE.Line} Created line object
     */
    createLine(posND1, posND2) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.15,
            linewidth: CONFIG.CONNECTION_LINE_WIDTH,
            depthTest: false,  // Always render grid lines on top (not occluded by cells)
            depthWrite: false  // Don't write to depth buffer (prevents transparency issues)
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { posND1, posND2 };
        line.renderOrder = 999;  // Render after most objects

        this.scene.add(line);
        this.connectionLines.push(line);

        return line;
    }

    /**
     * Create all connection lines from connection data
     * @param {Array} connections - Array of {posND1, posND2} objects
     */
    createAllLines(connections) {
        connections.forEach(conn => {
            this.createLine(conn.posND1, conn.posND2);
        });
    }

    /**
     * Update all connection lines based on current rotation
     * @param {Object} rotations - Rotation angles {xy, xz, xw, yz, yw, zw}
     * @param {Array} cells - Array of cell objects (for determining line colors)
     * @param {Object} hoveredCell - Currently hovered cell (optional)
     * @param {Object} previewCell - Currently previewed cell (optional)
     * @param {string} currentPlayer - Current player ('X' or 'O') for preview coloring
     */
    updateLines(rotations, cells = [], hoveredCell = null, previewCell = null, currentPlayer = 'X') {
        // Build map of cell positions to cell objects for fast lookup
        const cellMap = new Map();
        cells.forEach(cell => {
            const key = cell.posND.join(',');
            cellMap.set(key, cell);
        });

        // Get position keys for hover and preview cells
        const hoveredKey = hoveredCell ? hoveredCell.posND.join(',') : null;
        const previewKey = previewCell ? previewCell.posND.join(',') : null;

        this.connectionLines.forEach(line => {
            const { posND1, posND2 } = line.userData;

            // Get cells at both endpoints
            const key1 = posND1.join(',');
            const key2 = posND2.join(',');
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
            const rotated1 = rotate4D(posND1, rotations);
            const rotated2 = rotate4D(posND2, rotations);
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
                const color = currentPlayer === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
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

    /**
     * Dispose of all resources (alias for clear)
     */
    dispose() {
        this.clear();
    }
}
