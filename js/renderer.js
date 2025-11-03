/**
 * 3D visualization using Three.js
 */

import { CONFIG, FOUR_D_AXES } from './config.js';
import { rotate4D, project4Dto3D, getHueFromW, getScaleFromW, getOpacityFromW } from './math4d.js';

export class GridRenderer {
    constructor(container) {
        this.container = container;
        this.cells = [];
        this.cellMeshes = [];
        this.connectionLines = [];
        this.rotations = { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 };
        this.rotationCenter = { x: 0, y: 0, z: 0 };

        this.setupThreeJS();
        this.createGrid();
        this.createGridConnections();
    }

    /**
     * Initialize Three.js scene, camera, renderer
     */
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.SCENE_BACKGROUND);
        this.scene.fog = new THREE.Fog(CONFIG.SCENE_BACKGROUND, CONFIG.FOG_NEAR, CONFIG.FOG_FAR);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA_FOV,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, CONFIG.CAMERA_DISTANCE);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(
            CONFIG.AMBIENT_LIGHT_COLOR,
            CONFIG.AMBIENT_LIGHT_INTENSITY
        );
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(
            CONFIG.POINT_LIGHT_COLOR,
            CONFIG.POINT_LIGHT_INTENSITY,
            CONFIG.POINT_LIGHT_DISTANCE
        );
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Create the 4D grid cells
     */
    createGrid() {
        const offset = (CONFIG.GRID_SIZE - 1) * CONFIG.CELL_SPACING / 2;

        for (let w = 0; w < CONFIG.GRID_SIZE; w++) {
            for (let z = 0; z < CONFIG.GRID_SIZE; z++) {
                for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
                    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                        const cell = {
                            pos4d: [
                                x * CONFIG.CELL_SPACING - offset,
                                y * CONFIG.CELL_SPACING - offset,
                                z * CONFIG.CELL_SPACING - offset,
                                w * CONFIG.CELL_SPACING - offset
                            ],
                            coords: { x, y, z, w },
                            group: new THREE.Group(),
                            wireframe: null,
                            selectionMesh: null,
                            marker: null
                        };

                        this.createCellMesh(cell);
                        this.scene.add(cell.group);
                        this.cells.push(cell);
                    }
                }
            }
        }
    }

    /**
     * Create mesh for a single cell
     * @param {Object} cell - Cell object
     */
    createCellMesh(cell) {
        const geometry = new THREE.BoxGeometry(
            CONFIG.CELL_SIZE,
            CONFIG.CELL_SIZE,
            CONFIG.CELL_SIZE
        );

        // Wireframe edges - Enhanced visibility
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            linewidth: CONFIG.CELL_LINE_WIDTH  // Thicker lines
        });
        const wireframe = new THREE.LineSegments(edges, material);
        cell.group.add(wireframe);
        cell.wireframe = wireframe;

        // Invisible mesh for raycasting
        const selectionMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0
        });
        const selectionMesh = new THREE.Mesh(geometry, selectionMaterial);
        selectionMesh.userData = { cell };
        cell.group.add(selectionMesh);
        cell.selectionMesh = selectionMesh;

        this.cellMeshes.push(selectionMesh);
    }

    /**
     * Create connection lines between cells in all 4 axes
     */
    createGridConnections() {
        const offset = (CONFIG.GRID_SIZE - 1) * CONFIG.CELL_SPACING / 2;

        for (let w = 0; w < CONFIG.GRID_SIZE; w++) {
            for (let z = 0; z < CONFIG.GRID_SIZE; z++) {
                for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
                    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                        const pos4d = [
                            x * CONFIG.CELL_SPACING - offset,
                            y * CONFIG.CELL_SPACING - offset,
                            z * CONFIG.CELL_SPACING - offset,
                            w * CONFIG.CELL_SPACING - offset
                        ];

                        // Connect in X direction
                        if (x < CONFIG.GRID_SIZE - 1) {
                            this.createConnectionLine(pos4d, [
                                (x + 1) * CONFIG.CELL_SPACING - offset,
                                y * CONFIG.CELL_SPACING - offset,
                                z * CONFIG.CELL_SPACING - offset,
                                w * CONFIG.CELL_SPACING - offset
                            ]);
                        }

                        // Connect in Y direction
                        if (y < CONFIG.GRID_SIZE - 1) {
                            this.createConnectionLine(pos4d, [
                                x * CONFIG.CELL_SPACING - offset,
                                (y + 1) * CONFIG.CELL_SPACING - offset,
                                z * CONFIG.CELL_SPACING - offset,
                                w * CONFIG.CELL_SPACING - offset
                            ]);
                        }

                        // Connect in Z direction
                        if (z < CONFIG.GRID_SIZE - 1) {
                            this.createConnectionLine(pos4d, [
                                x * CONFIG.CELL_SPACING - offset,
                                y * CONFIG.CELL_SPACING - offset,
                                (z + 1) * CONFIG.CELL_SPACING - offset,
                                w * CONFIG.CELL_SPACING - offset
                            ]);
                        }

                        // Connect in W direction
                        if (w < CONFIG.GRID_SIZE - 1) {
                            this.createConnectionLine(pos4d, [
                                x * CONFIG.CELL_SPACING - offset,
                                y * CONFIG.CELL_SPACING - offset,
                                z * CONFIG.CELL_SPACING - offset,
                                (w + 1) * CONFIG.CELL_SPACING - offset
                            ]);
                        }
                    }
                }
            }
        }
    }

    /**
     * Create a single connection line
     * @param {Array} pos4d1 - Start position [x, y, z, w]
     * @param {Array} pos4d2 - End position [x, y, z, w]
     */
    createConnectionLine(pos4d1, pos4d2) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.15,
            linewidth: CONFIG.CONNECTION_LINE_WIDTH  // Thicker connection lines
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { pos4d1, pos4d2 };

        this.scene.add(line);
        this.connectionLines.push(line);
    }

    /**
     * Update all cell positions based on current rotation
     */
    updateCellPositions() {
        this.cells.forEach(cell => {
            const rotated = rotate4D(cell.pos4d, this.rotations);
            const [x, y, z, w] = project4Dto3D(rotated);

            cell.group.position.set(x, y, z);

            // Update color based on W coordinate - More vibrant colors
            const hue = getHueFromW(w);
            const opacity = getOpacityFromW(w);
            const scale = getScaleFromW(w);

            // Only update color if no marker is placed
            if (!cell.marker) {
                cell.wireframe.material.color.setHSL(
                    hue,
                    CONFIG.SATURATION,
                    CONFIG.LIGHTNESS
                );
                cell.wireframe.material.opacity = opacity;
            } else {
                // Marked cells have higher opacity and thicker lines
                cell.wireframe.material.opacity = CONFIG.MARKED_CELL_OPACITY;
            }

            cell.group.scale.setScalar(scale);
        });
    }

    /**
     * Update connection line positions
     */
    updateConnectionLines() {
        this.connectionLines.forEach(line => {
            const { pos4d1, pos4d2 } = line.userData;

            const rotated1 = rotate4D(pos4d1, this.rotations);
            const rotated2 = rotate4D(pos4d2, this.rotations);
            const [x1, y1, z1, w1] = project4Dto3D(rotated1);
            const [x2, y2, z2, w2] = project4Dto3D(rotated2);

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
     * Create a marker (X or O) on a cell
     * @param {Object} cell - Cell object
     * @param {string} player - 'X' or 'O'
     */
    createMarker(cell, player) {
        // Create canvas texture for marker
        const canvas = document.createElement('canvas');
        canvas.width = CONFIG.MARKER_CANVAS_SIZE;
        canvas.height = CONFIG.MARKER_CANVAS_SIZE;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = player === 'X' ? '#ff00ff' : '#00ffff';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(CONFIG.MARKER_SCALE, CONFIG.MARKER_SCALE, 1);

        cell.group.add(sprite);
        cell.marker = sprite;

        // Update wireframe color
        const color = player === 'X' ? CONFIG.PLAYER_X_COLOR : CONFIG.PLAYER_O_COLOR;
        cell.wireframe.material.color.setHex(color);
        cell.wireframe.material.opacity = 0.6;
    }

    /**
     * Find cell at screen coordinates
     * @param {number} mouseX - Normalized mouse X (-1 to 1)
     * @param {number} mouseY - Normalized mouse Y (-1 to 1)
     * @returns {Object|null} Cell object or null
     */
    getCellAtMouse(mouseX, mouseY) {
        const mouse = new THREE.Vector2(mouseX, mouseY);
        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cellMeshes);

        if (intersects.length > 0) {
            return intersects[0].object.userData.cell;
        }
        return null;
    }

    /**
     * Clear all markers from cells
     */
    clearMarkers() {
        this.cells.forEach(cell => {
            if (cell.marker) {
                cell.group.remove(cell.marker);
                cell.marker = null;
            }
            cell.wireframe.material.color.setHex(0x00ffff);
            cell.wireframe.material.opacity = 0.3;
        });
    }

    /**
     * Update rotation angles
     * @param {Object} rotations - Object with rotation angles
     */
    setRotations(rotations) {
        this.rotations = { ...rotations };
    }

    /**
     * Set camera distance (for pinch zoom)
     * @param {number} distance - Camera distance from origin
     */
    setCameraDistance(distance) {
        this.camera.position.z = Math.max(5, Math.min(25, distance)); // Clamp between 5 and 25
    }

    /**
     * Adjust camera distance by delta (for pinch gesture)
     * @param {number} delta - Distance change
     */
    adjustCameraDistance(delta) {
        const currentZ = this.camera.position.z;
        this.setCameraDistance(currentZ - delta); // Negative because pinch out should zoom in
    }

    /**
     * Pan camera position (for two-finger pan gesture)
     * @param {number} deltaX - X movement
     * @param {number} deltaY - Y movement
     */
    panCamera(deltaX, deltaY) {
        this.camera.position.x += deltaX;
        this.camera.position.y += deltaY;
        this.rotationCenter.x += deltaX;
        this.rotationCenter.y += deltaY;
        this.camera.lookAt(this.rotationCenter.x, this.rotationCenter.y, this.rotationCenter.z);
    }

    /**
     * Set rotation center offset
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {number} offset - Offset value
     */
    setRotationCenter(axis, offset) {
        this.rotationCenter[axis] = offset;
        this.camera.lookAt(this.rotationCenter.x, this.rotationCenter.y, this.rotationCenter.z);
    }

    /**
     * Render the scene
     */
    render() {
        this.updateCellPositions();
        this.updateConnectionLines();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    /**
     * Get renderer's DOM element
     * @returns {HTMLCanvasElement}
     */
    getCanvas() {
        return this.renderer.domElement;
    }
}
