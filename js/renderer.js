/**
 * 3D visualization using Three.js
 */

import { CONFIG, FOUR_D_AXES } from './config.js';
import { rotate4D, project4Dto3D, getScaleFromW } from './mathnd.js';
import { RotationInitializer } from './game/RotationInitializer.js';
import { SceneManager } from './rendering/SceneManager.js';
import { CameraController } from './rendering/CameraController.js';
import { CellAppearanceManager } from './rendering/CellAppearanceManager.js';
import { GridBuilder } from './grid/GridBuilder.js';
import { ConnectionManager } from './grid/ConnectionManager.js';

export class GridRenderer {
    constructor(container, store = null) {
        this.container = container;
        this.store = store; // Store reference for state management
        this.cells = [];
        this.cellMeshes = [];

        // Initialize rotations dynamically based on dimensions
        this.dimensions = CONFIG.DIMENSIONS || 4;
        this.rotations = RotationInitializer.createRotations(this.dimensions);

        // Initialize appearance manager
        this.appearanceManager = new CellAppearanceManager();

        this.setupThreeJS();
        this.createGrid();
        this.createGridConnections();
        this.setupHoverDetection();
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
        // Get settings from store if available, otherwise use instance dimensions
        const dimensions = this.store
            ? this.store.getState().settings.dimensions
            : this.dimensions;
        const gridSize = this.store
            ? this.store.getState().settings.gridSize
            : CONFIG.GRID_SIZE;

        // Use GridBuilder to generate cell data
        const gridBuilder = new GridBuilder({ dimensions, gridSize });
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

            // Update hovered cell in store if store is available
            if (this.store) {
                const currentHoveredCell = this.store.getState().visual.hoveredCell;
                const newHoveredCell = cell ? cell.coordsArray : null;

                // Only dispatch if changed (compare arrays)
                const hasChanged = !this._areCoordsEqual(currentHoveredCell, newHoveredCell);
                if (hasChanged) {
                    this.store.dispatch({
                        type: 'SET_HOVERED_CELL',
                        payload: { position: newHoveredCell }
                    });
                }
            }
        });

        // Clear hover when mouse leaves canvas
        canvas.addEventListener('mouseleave', () => {
            if (this.store) {
                this.store.dispatch({
                    type: 'SET_HOVERED_CELL',
                    payload: { position: null }
                });
            }
        });
    }

    /**
     * Helper to compare coordinate arrays
     * @private
     */
    _areCoordsEqual(coords1, coords2) {
        if (coords1 === null && coords2 === null) return true;
        if (coords1 === null || coords2 === null) return false;
        if (coords1.length !== coords2.length) return false;
        return coords1.every((val, i) => val === coords2[i]);
    }

    /**
     * Get marker state for a cell from move history
     * @param {Array<number>} position - Cell position coordinates
     * @param {Array} moveHistory - Move history from state
     * @returns {{ hasMarker: boolean, player: string|null }} Marker state
     * @private
     */
    _getCellMarkerFromHistory(position, moveHistory) {
        if (!moveHistory || moveHistory.length === 0) {
            return { hasMarker: false, player: null };
        }

        // Find if this position exists in move history
        const move = moveHistory.find(m =>
            this._areCoordsEqual(m.position, position)
        );

        if (move) {
            return { hasMarker: true, player: move.player };
        }

        return { hasMarker: false, player: null };
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
        // Get settings from store if available, otherwise use instance dimensions
        const dimensions = this.store
            ? this.store.getState().settings.dimensions
            : this.dimensions;
        const gridSize = this.store
            ? this.store.getState().settings.gridSize
            : CONFIG.GRID_SIZE;

        // Use GridBuilder to generate connection data
        const gridBuilder = new GridBuilder({ dimensions, gridSize });
        const connections = gridBuilder.generateConnections();

        // Use ConnectionManager to create line objects
        this.connectionManager = new ConnectionManager(this.sceneManager.getScene());
        this.connectionManager.createAllLines(connections);
    }

    /**
     * Update all cell positions and appearance based on current rotation
     */
    updateCellPositions() {
        // Get visual state and move history from store
        let hoveredCell = null;
        let previewCell = null;
        let currentPlayer = 'X';
        let moveHistory = [];

        if (this.store) {
            const state = this.store.getState();

            if (state.visual.hoveredCell) {
                hoveredCell = this.getCellByCoords(state.visual.hoveredCell);
            }

            if (state.visual.previewCell) {
                previewCell = this.getCellByCoords(state.visual.previewCell);
            }

            currentPlayer = state.game.currentPlayer;
            moveHistory = state.game.moveHistory || [];
        }

        this.cells.forEach(cell => {
            const rotated = rotate4D(cell.posND, this.rotations);
            const [x, y, z, w] = project4Dto3D(rotated);

            // Update position
            cell.group.position.set(x, y, z);

            // Scale based on W coordinate for depth perception
            const scale = getScaleFromW(w);
            cell.group.scale.setScalar(scale);

            // Get marker state from move history
            const { hasMarker, player: markerPlayer } = this._getCellMarkerFromHistory(cell.coordsArray, moveHistory);

            // Update appearance (delegates to CellAppearanceManager)
            const isHovered = cell === hoveredCell;
            const isPreview = cell === previewCell;
            this.appearanceManager.updateCellAppearance(cell, w, isHovered, isPreview, currentPlayer, hasMarker, markerPlayer);
        });
    }

    /**
     * Update connection line positions
     * Delegates to ConnectionManager
     */
    updateConnectionLines() {
        // Get hovered and preview cells from store
        let hoveredCell = null;
        let previewCell = null;
        let moveHistory = [];
        let currentPlayer = 'X';
        if (this.store) {
            const state = this.store.getState();

            if (state.visual.hoveredCell) {
                hoveredCell = this.getCellByCoords(state.visual.hoveredCell);
            }

            if (state.visual.previewCell) {
                previewCell = this.getCellByCoords(state.visual.previewCell);
            }

            moveHistory = state.game.moveHistory || [];
            currentPlayer = state.game.currentPlayer;
        }

        // Add marker information to cells for connection line coloring
        this.cells.forEach(cell => {
            const { hasMarker, player: markerPlayer } = this._getCellMarkerFromHistory(cell.coordsArray, moveHistory);
            cell.isSelected = hasMarker;
            cell.player = markerPlayer;
        });

        this.connectionManager.updateLines(
            this.rotations,
            this.cells,
            hoveredCell,
            previewCell,
            currentPlayer
        );
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
     * @param {string} player - Player ('X' or 'O') - deprecated parameter, player is now read from store
     */
    setPreviewSelection(cell, player) {
        if (this.store) {
            const position = cell ? cell.coordsArray : null;
            this.store.dispatch({
                type: 'SET_PREVIEW_CELL',
                payload: { position }
            });
        }
    }

    /**
     * Clear preview selection
     */
    clearPreviewSelection() {
        if (this.store) {
            this.store.dispatch({
                type: 'SET_PREVIEW_CELL',
                payload: { position: null }
            });
        }
    }

    /**
     * Get current preview cell
     * @returns {Object|null}
     */
    getPreviewCell() {
        if (this.store) {
            const previewCoords = this.store.getState().visual.previewCell;
            if (previewCoords) {
                return this.getCellByCoords(previewCoords);
            }
        }
        return null;
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

    /**
     * Dispose of all Three.js resources
     */
    dispose() {
        // Dispose connection manager
        if (this.connectionManager) {
            this.connectionManager.dispose();
        }

        // Dispose cell meshes
        this.cells.forEach(cell => {
            if (cell.group) {
                // Remove group from scene
                this.sceneManager.remove(cell.group);

                // Dispose geometries and materials
                cell.group.traverse((child) => {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        });

        // Clear arrays
        this.cells = [];
        this.cellMeshes = [];

        // Dispose scene manager
        this.sceneManager.dispose();
    }

    /**
     * Get cell by coordinates (adapter for new architecture)
     * @param {Array<number>} coords - Cell coordinates
     * @returns {Object|null} Cell object or null
     */
    getCellByCoords(coords) {
        return this.cells.find(cell => {
            if (!cell.coordsArray) return false;
            if (cell.coordsArray.length !== coords.length) return false;
            return cell.coordsArray.every((val, i) => val === coords[i]);
        }) || null;
    }

    /**
     * Recreate grid with new dimensions (adapter for new architecture)
     * @param {number} dimensions - Number of dimensions
     * @param {number} gridSize - Grid size
     */
    recreateGrid(dimensions, gridSize) {
        // Clear existing grid (markers are automatically cleared as they're cell properties)
        this.cells.forEach(cell => {
            if (cell.group) {
                this.sceneManager.scene.remove(cell.group);
            }
        });

        // Clear connections using ConnectionManager
        if (this.connectionManager) {
            this.connectionManager.clear();
        }

        // Clear arrays
        this.cells = [];
        this.cellMeshes = [];

        // Update dimensions (CONFIG is now read-only, dimensions come from StateStore)
        this.dimensions = dimensions;

        // Reinitialize rotations
        this.rotations = RotationInitializer.createRotations(dimensions);

        // Recreate grid and connections
        this.createGrid();
        this.createGridConnections();

        // Reset hover and preview states in store
        if (this.store) {
            this.store.dispatch({
                type: 'SET_HOVERED_CELL',
                payload: { position: null }
            });
            this.store.dispatch({
                type: 'SET_PREVIEW_CELL',
                payload: { position: null }
            });
        }
    }
}
