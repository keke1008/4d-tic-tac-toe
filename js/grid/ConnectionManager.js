/**
 * Manager for connection lines between 4D grid cells
 * Handles creation and updates of Three.js line objects
 */

import { CONFIG } from '../config.js';
import { rotate4D, project4Dto3D, getHueFromW } from '../math4d.js';

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
     */
    updateLines(rotations) {
        this.connectionLines.forEach(line => {
            const { pos4d1, pos4d2 } = line.userData;

            // Rotate and project endpoints
            const rotated1 = rotate4D(pos4d1, rotations);
            const rotated2 = rotate4D(pos4d2, rotations);
            const [x1, y1, z1, w1] = project4Dto3D(rotated1);
            const [x2, y2, z2, w2] = project4Dto3D(rotated2);

            // Update line geometry
            const positions = line.geometry.attributes.position.array;
            positions[0] = x1;
            positions[1] = y1;
            positions[2] = z1;
            positions[3] = x2;
            positions[4] = y2;
            positions[5] = z2;
            line.geometry.attributes.position.needsUpdate = true;

            // Update color based on average W coordinate
            const avgW = (w1 + w2) / 2;
            const hue = getHueFromW(avgW);
            const wFactor = (avgW + 2) / 4;
            const opacity = CONFIG.CONNECTION_OPACITY_MIN + wFactor * CONFIG.CONNECTION_OPACITY_RANGE;

            line.material.color.setHSL(hue, CONFIG.SATURATION * 0.8, CONFIG.LIGHTNESS * 0.7);
            line.material.opacity = opacity;
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
