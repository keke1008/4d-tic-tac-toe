/**
 * Root reducer and domain reducers
 * Pure functions that update state based on actions
 */
import { ActionTypes } from './actions.js';

// Initial state structure
export const initialState = {
    game: {
        board: null,  // Will be initialized with proper BoardState in Phase 2
        currentPlayer: 'X',
        gamePhase: 'playing',  // 'playing' | 'won' | 'draw'
        winner: null,
        moveHistory: [],
    },
    settings: {
        dimensions: 4,
        gridSize: 4,
    },
    visual: {
        rotation: {},  // { xy: 0, xz: 0, ... }
        cameraPosition: { x: 0, y: 0, z: 12 },
        cameraDistance: 12,
        hoveredCell: null,
        previewCell: null,
        autoRotate: true,
    },
    ui: {
        settingsModalOpen: false,
        helpPanelOpen: false,
        status: 'プレイヤー X のターン',
        isVictoryStatus: false,
    }
};

/**
 * Root reducer - combines all domain reducers
 * @param {Object} state - Current state
 * @param {Object} action - Action to process
 * @returns {Object} New state
 */
export function rootReducer(state = initialState, action) {
    return {
        game: gameReducer(state.game, action, state),
        settings: settingsReducer(state.settings, action, state),
        visual: visualReducer(state.visual, action, state),
        ui: uiReducer(state.ui, action, state),
    };
}

/**
 * Game state reducer
 * @param {Object} state - Current game state
 * @param {Object} action - Action to process
 * @param {Object} rootState - Full root state (for cross-slice access if needed)
 * @returns {Object} New game state
 */
function gameReducer(state = initialState.game, action, rootState) {
    switch (action.type) {
        case ActionTypes.PLACE_MARKER:
            // Placeholder - will be replaced with GameRules.placeMarker in Phase 2
            return {
                ...state,
                moveHistory: [
                    ...state.moveHistory,
                    {
                        position: action.payload.position,
                        player: action.payload.player,
                        timestamp: Date.now()
                    }
                ]
            };

        case ActionTypes.SWITCH_PLAYER:
            return {
                ...state,
                currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X'
            };

        case ActionTypes.SET_GAME_PHASE:
            return {
                ...state,
                gamePhase: action.payload.phase
            };

        case ActionTypes.SET_WINNER:
            return {
                ...state,
                winner: action.payload.winner,
                gamePhase: 'won'
            };

        case ActionTypes.RESET_GAME:
            return {
                ...initialState.game,
                // Reset with potentially new settings
            };

        case ActionTypes.UNDO_MOVE:
            // Placeholder - will be implemented in Phase 2 with GameRules
            if (state.moveHistory.length === 0) {
                return state;
            }
            return {
                ...state,
                moveHistory: state.moveHistory.slice(0, -1)
            };

        default:
            return state;
    }
}

/**
 * Settings state reducer
 * @param {Object} state - Current settings state
 * @param {Object} action - Action to process
 * @param {Object} rootState - Full root state
 * @returns {Object} New settings state
 */
function settingsReducer(state = initialState.settings, action, rootState) {
    switch (action.type) {
        case ActionTypes.UPDATE_SETTINGS:
            return {
                ...state,
                ...action.payload.settings
            };

        case ActionTypes.SET_DIMENSIONS:
            return {
                ...state,
                dimensions: action.payload.dimensions
            };

        case ActionTypes.SET_GRID_SIZE:
            return {
                ...state,
                gridSize: action.payload.gridSize
            };

        default:
            return state;
    }
}

/**
 * Visual state reducer
 * @param {Object} state - Current visual state
 * @param {Object} action - Action to process
 * @param {Object} rootState - Full root state
 * @returns {Object} New visual state
 */
function visualReducer(state = initialState.visual, action, rootState) {
    switch (action.type) {
        case ActionTypes.UPDATE_ROTATION:
            const { axis, delta } = action.payload;
            return {
                ...state,
                rotation: {
                    ...state.rotation,
                    [axis]: (state.rotation[axis] || 0) + delta
                }
            };

        case ActionTypes.SET_ROTATION:
            return {
                ...state,
                rotation: action.payload.rotations
            };

        case ActionTypes.SET_CAMERA_POSITION:
            return {
                ...state,
                cameraPosition: action.payload.position
            };

        case ActionTypes.SET_CAMERA_DISTANCE:
            return {
                ...state,
                cameraDistance: action.payload.distance
            };

        case ActionTypes.SET_HOVERED_CELL:
            return {
                ...state,
                hoveredCell: action.payload.position
            };

        case ActionTypes.SET_PREVIEW_CELL:
            return {
                ...state,
                previewCell: action.payload.position
            };

        case ActionTypes.TOGGLE_AUTO_ROTATE:
            return {
                ...state,
                autoRotate: !state.autoRotate
            };

        case ActionTypes.SET_AUTO_ROTATE:
            return {
                ...state,
                autoRotate: action.payload.enabled
            };

        default:
            return state;
    }
}

/**
 * UI state reducer
 * @param {Object} state - Current UI state
 * @param {Object} action - Action to process
 * @param {Object} rootState - Full root state
 * @returns {Object} New UI state
 */
function uiReducer(state = initialState.ui, action, rootState) {
    switch (action.type) {
        case ActionTypes.TOGGLE_SETTINGS_MODAL:
            return {
                ...state,
                settingsModalOpen: !state.settingsModalOpen
            };

        case ActionTypes.SET_SETTINGS_MODAL_OPEN:
            return {
                ...state,
                settingsModalOpen: action.payload.open
            };

        case ActionTypes.TOGGLE_HELP_PANEL:
            return {
                ...state,
                helpPanelOpen: !state.helpPanelOpen
            };

        case ActionTypes.UPDATE_STATUS:
            return {
                ...state,
                status: action.payload.message,
                isVictoryStatus: action.payload.isVictory
            };

        default:
            return state;
    }
}
