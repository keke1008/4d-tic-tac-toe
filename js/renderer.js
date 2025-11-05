/**
 * 3D visualization using Three.js
 */

import { CONFIG, FOUR_D_AXES } from './config.js';
import { rotate4D, project4Dto3D, getScaleFromW, generateRotationPlanes, getRotationPlaneName } from './mathnd.js';
import { SceneManager } from './rendering/SceneManager.js';
import { CameraController } from './rendering/CameraController.js';
import { MarkerRenderer } from './rendering/MarkerRenderer.js';
import { CellAppearanceManager } from './rendering/CellAppearanceManager.js';
import { GridBuilder } from './grid/GridBuilder.js';
import { ConnectionManager } from './grid/ConnectionManager.js';

export class GridRenderer {
    constructor(container) {
        this.container = container;
        this.cells = [];
        this.cellMeshes = [];

        // Initialize rotations dynamically based on dimensions
        this.dimensions = CONFIG.DIMENSIONS || 4;
        this.rotations = this.initializeRotations();

        // Hover and preview state
        this.hoveredCell = null;
        this.previewCell = null;

        // Initialize renderers and managers
        this.markerRenderer = new MarkerRenderer();
        this.appearanceManager = new CellAppearanceManager();

        this.setupThreeJS();
        this.createGrid();
        this.createGridConnections();
        this.setupHoverDetection();
    }

    /**
     * Initialize rotation angles for all rotation planes
     * @returns {Object} Rotation object with all planes set to 0
     */
    initializeRotations() {
        const rotations = {};
        const planes = generateRotationPlanes(this.dimensions);

        for (const [axis1, axis2] of planes) {
            const planeName = getRotationPlaneName(axis1, axis2);
            rotations[planeName] = 0;
        }

        return rotations;
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
     * Setup hover detection via mouse move
     */
    setupHoverDetection() {
        const canvas = this.sceneManager.getCanvas();

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const cell = this.getCellAtMouse(mouseX, mouseY);

            // Update hovered cell
            if (cell !== this.hoveredCell) {
                this.hoveredCell = cell;
            }
        });

        // Clear hover when mouse leaves canvas
        canvas.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
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
     * Update all cell positions and appearance based on current rotation
     */
    updateCellPositions() {
        this.cells.forEach(cell => {
            const rotated = rotate4D(cell.pos4d, this.rotations);
            const [x, y, z, w] = project4Dto3D(rotated);

            // Update position
            cell.group.position.set(x, y, z);

            // Scale based on W coordinate for depth perception
            const scale = getScaleFromW(w);
            cell.group.scale.setScalar(scale);

            // Update appearance (delegates to CellAppearanceManager)
            const isHovered = cell === this.hoveredCell;
            const isPreview = cell === this.previewCell;
            this.appearanceManager.updateCellAppearance(cell, w, isHovered, isPreview);
        });
    }

    /**
     * Update connection line positions
     * Delegates to ConnectionManager
     */
    updateConnectionLines() {
        this.connectionManager.updateLines(
            this.rotations,
            this.cells,
            this.hoveredCell,
            this.previewCell
        );
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
     * Set preview selection for a cell
     * @param {Object} cell - Cell to preview
     * @param {string} player - Player ('X' or 'O')
     */
    setPreviewSelection(cell, player) {
        this.previewCell = cell;
        if (cell) {
            cell.previewPlayer = player;
        }
    }

    /**
     * Clear preview selection
     */
    clearPreviewSelection() {
        if (this.previewCell) {
            this.previewCell.previewPlayer = null;
        }
        this.previewCell = null;
    }

    /**
     * Get current preview cell
     * @returns {Object|null}
     */
    getPreviewCell() {
        return this.previewCell;
    }

    /**
     * Clear all markers from cells
     * Delegates to MarkerRenderer
     */
    clearMarkers() {
        this.markerRenderer.clearAllMarkers(this.cells);
        this.clearPreviewSelection();
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
