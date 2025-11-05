/**
 * Action types and action creators
 * All possible actions in the application
 */

// Action type constants
export const ActionTypes = {
    // Game actions
    PLACE_MARKER: 'PLACE_MARKER',
    RESET_GAME: 'RESET_GAME',
    SWITCH_PLAYER: 'SWITCH_PLAYER',
    SET_GAME_PHASE: 'SET_GAME_PHASE',
    SET_WINNER: 'SET_WINNER',
    UNDO_MOVE: 'UNDO_MOVE',
    REDO_MOVE: 'REDO_MOVE',

    // Visual actions
    UPDATE_ROTATION: 'UPDATE_ROTATION',
    SET_ROTATION: 'SET_ROTATION',
    SET_CAMERA_POSITION: 'SET_CAMERA_POSITION',
    SET_CAMERA_DISTANCE: 'SET_CAMERA_DISTANCE',
    SET_HOVERED_CELL: 'SET_HOVERED_CELL',
    SET_PREVIEW_CELL: 'SET_PREVIEW_CELL',
    TOGGLE_AUTO_ROTATE: 'TOGGLE_AUTO_ROTATE',
    SET_AUTO_ROTATE: 'SET_AUTO_ROTATE',

    // Settings actions
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    SET_DIMENSIONS: 'SET_DIMENSIONS',
    SET_GRID_SIZE: 'SET_GRID_SIZE',

    // UI actions
    TOGGLE_SETTINGS_MODAL: 'TOGGLE_SETTINGS_MODAL',
    SET_SETTINGS_MODAL_OPEN: 'SET_SETTINGS_MODAL_OPEN',
    TOGGLE_HELP_PANEL: 'TOGGLE_HELP_PANEL',
    UPDATE_STATUS: 'UPDATE_STATUS',
};

// Action creators - functions that create actions
export const Actions = {
    // Game actions
    placeMarker: (position, player) => ({
        type: ActionTypes.PLACE_MARKER,
        payload: { position, player }
    }),

    resetGame: (settings = null) => ({
        type: ActionTypes.RESET_GAME,
        payload: { settings }
    }),

    switchPlayer: () => ({
        type: ActionTypes.SWITCH_PLAYER
    }),

    setGamePhase: (phase) => ({
        type: ActionTypes.SET_GAME_PHASE,
        payload: { phase }
    }),

    setWinner: (winner) => ({
        type: ActionTypes.SET_WINNER,
        payload: { winner }
    }),

    undoMove: () => ({
        type: ActionTypes.UNDO_MOVE
    }),

    redoMove: () => ({
        type: ActionTypes.REDO_MOVE
    }),

    // Visual actions
    updateRotation: (axis, delta) => ({
        type: ActionTypes.UPDATE_ROTATION,
        payload: { axis, delta }
    }),

    setRotation: (rotations) => ({
        type: ActionTypes.SET_ROTATION,
        payload: { rotations }
    }),

    setCameraPosition: (position) => ({
        type: ActionTypes.SET_CAMERA_POSITION,
        payload: { position }
    }),

    setCameraDistance: (distance) => ({
        type: ActionTypes.SET_CAMERA_DISTANCE,
        payload: { distance }
    }),

    setHoveredCell: (position) => ({
        type: ActionTypes.SET_HOVERED_CELL,
        payload: { position }
    }),

    setPreviewCell: (position) => ({
        type: ActionTypes.SET_PREVIEW_CELL,
        payload: { position }
    }),

    toggleAutoRotate: () => ({
        type: ActionTypes.TOGGLE_AUTO_ROTATE
    }),

    setAutoRotate: (enabled) => ({
        type: ActionTypes.SET_AUTO_ROTATE,
        payload: { enabled }
    }),

    // Settings actions
    updateSettings: (settings) => ({
        type: ActionTypes.UPDATE_SETTINGS,
        payload: { settings }
    }),

    setDimensions: (dimensions) => ({
        type: ActionTypes.SET_DIMENSIONS,
        payload: { dimensions }
    }),

    setGridSize: (gridSize) => ({
        type: ActionTypes.SET_GRID_SIZE,
        payload: { gridSize }
    }),

    // UI actions
    toggleSettingsModal: () => ({
        type: ActionTypes.TOGGLE_SETTINGS_MODAL
    }),

    setSettingsModalOpen: (open) => ({
        type: ActionTypes.SET_SETTINGS_MODAL_OPEN,
        payload: { open }
    }),

    toggleHelpPanel: () => ({
        type: ActionTypes.TOGGLE_HELP_PANEL
    }),

    updateStatus: (message, isVictory = false) => ({
        type: ActionTypes.UPDATE_STATUS,
        payload: { message, isVictory }
    }),
};
