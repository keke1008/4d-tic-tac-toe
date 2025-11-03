/**
 * 3D visualization using Three.js
 */

import { CONFIG, FOUR_D_AXES } from './config.js';
import { rotate4D, project4Dto3D, getHueFromW, getScaleFromW, getOpacityFromW } from './math4d.js';
import { CameraController } from './rendering/CameraController.js';
import { GridBuilder } from './grid/GridBuilder.js';
import { ConnectionManager } from './grid/ConnectionManager.js';

export class GridRenderer {
    constructor(container) {
        this.container = container;
        this.cells = [];
        this.cellMeshes = [];
        this.rotations = { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 };

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

        // Camera controller
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.cameraController = new CameraController(aspect);

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
        // Use GridBuilder to generate cell data
        const gridBuilder = new GridBuilder();
        this.cells = gridBuilder.generateCells();

        // Create Three.js meshes for each cell
        this.cells.forEach(cell => {
            cell.group = new THREE.Group();
            this.createCellMesh(cell);
            this.scene.add(cell.group);
        });
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
        // Use GridBuilder to generate connection data
        const gridBuilder = new GridBuilder();
        const connections = gridBuilder.generateConnections();

        // Use ConnectionManager to create line objects
        this.connectionManager = new ConnectionManager(this.scene);
        this.connectionManager.createAllLines(connections);
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
     * Delegates to ConnectionManager
     */
    updateConnectionLines() {
        this.connectionManager.updateLines(this.rotations);
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
        this.raycaster.setFromCamera(mouse, this.cameraController.getCamera());
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
     * Delegates to CameraController
     * @param {number} distance - Camera distance from origin
     */
    setCameraDistance(distance) {
        this.cameraController.setCameraDistance(distance);
    }

    /**
     * Adjust camera distance by delta (for pinch gesture)
     * Delegates to CameraController
     * @param {number} delta - Distance change
     */
    adjustCameraDistance(delta) {
        this.cameraController.adjustCameraDistance(delta);
    }

    /**
     * Pan camera position (for two-finger pan gesture)
     * Delegates to CameraController
     * @param {number} deltaX - X movement
     * @param {number} deltaY - Y movement
     */
    panCamera(deltaX, deltaY) {
        this.cameraController.panCamera(deltaX, deltaY);
    }

    /**
     * Set rotation center offset
     * Delegates to CameraController
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {number} offset - Offset value
     */
    setRotationCenter(axis, offset) {
        this.cameraController.setRotationCenter(axis, offset);
    }

    /**
     * Render the scene
     */
    render() {
        this.updateCellPositions();
        this.updateConnectionLines();
        this.renderer.render(this.scene, this.cameraController.getCamera());
    }

    /**
     * Handle window resize
     */
    onResize() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.cameraController.updateAspect(aspect);
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
