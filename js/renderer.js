/**
 * 3D visualization using Three.js
 */

import { CONFIG, FOUR_D_AXES } from './config.js';
import { rotate4D, project4Dto3D, getHueFromW, getScaleFromW, getOpacityFromW } from './math4d.js';
import { SceneManager } from './rendering/SceneManager.js';
import { CameraController } from './rendering/CameraController.js';
import { MarkerRenderer } from './rendering/MarkerRenderer.js';
import { GridBuilder } from './grid/GridBuilder.js';
import { ConnectionManager } from './grid/ConnectionManager.js';

export class GridRenderer {
    constructor(container) {
        this.container = container;
        this.cells = [];
        this.cellMeshes = [];
        this.rotations = { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 };

        // Initialize marker renderer
        this.markerRenderer = new MarkerRenderer();

        this.setupThreeJS();
        this.createGrid();
        this.createGridConnections();
    }

    /**
     * Initialize Three.js scene, camera, renderer
     */
    setupThreeJS() {
        // Scene manager (handles scene, renderer, lighting, raycaster)
        this.sceneManager = new SceneManager(this.container);

        // Camera controller
        const aspect = this.sceneManager.getAspect();
        this.cameraController = new CameraController(aspect);

        // Setup resize callback for camera
        this.sceneManager.setResizeCallback((aspect) => {
            this.cameraController.updateAspect(aspect);
        });
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
            this.sceneManager.add(cell.group);
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
        this.connectionManager = new ConnectionManager(this.sceneManager.getScene());
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

            // Scale based on W coordinate for depth perception
            const scale = getScaleFromW(w);
            cell.group.scale.setScalar(scale);

            // Color and opacity: unselected cells use unified color, selected cells use player color
            if (!cell.marker) {
                // Unselected: unified color for all cells
                cell.wireframe.material.color.setHex(CONFIG.UNSELECTED_CELL_COLOR);
                cell.wireframe.material.opacity = CONFIG.UNSELECTED_CELL_OPACITY;
            } else {
                // Selected: player color with high opacity (set by MarkerRenderer)
                cell.wireframe.material.opacity = CONFIG.SELECTED_CELL_OPACITY;
            }
        });
    }

    /**
     * Update connection line positions
     * Delegates to ConnectionManager
     */
    updateConnectionLines() {
        this.connectionManager.updateLines(this.rotations, this.cells);
    }

    /**
     * Create a marker (X or O) on a cell
     * Delegates to MarkerRenderer
     * @param {Object} cell - Cell object
     * @param {string} player - 'X' or 'O'
     */
    createMarker(cell, player) {
        this.markerRenderer.createMarker(cell, player);
    }

    /**
     * Find cell at screen coordinates
     * @param {number} mouseX - Normalized mouse X (-1 to 1)
     * @param {number} mouseY - Normalized mouse Y (-1 to 1)
     * @returns {Object|null} Cell object or null
     */
    getCellAtMouse(mouseX, mouseY) {
        const mouse = new THREE.Vector2(mouseX, mouseY);
        const raycaster = this.sceneManager.getRaycaster();
        raycaster.setFromCamera(mouse, this.cameraController.getCamera());
        const intersects = raycaster.intersectObjects(this.cellMeshes);

        if (intersects.length > 0) {
            return intersects[0].object.userData.cell;
        }
        return null;
    }

    /**
     * Clear all markers from cells
     * Delegates to MarkerRenderer
     */
    clearMarkers() {
        this.markerRenderer.clearAllMarkers(this.cells);
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
     * Delegates to SceneManager
     */
    render() {
        this.updateCellPositions();
        this.updateConnectionLines();
        this.sceneManager.render(this.cameraController.getCamera());
    }

    /**
     * Handle window resize
     * Note: Resize is now handled by SceneManager with callback
     */
    onResize() {
        // This method is kept for backwards compatibility
        // Actual resize handling is done via SceneManager's callback
    }

    /**
     * Get renderer's DOM element
     * Delegates to SceneManager
     * @returns {HTMLCanvasElement}
     */
    getCanvas() {
        return this.sceneManager.getCanvas();
    }
}
