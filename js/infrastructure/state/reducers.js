/**
 * Root reducer and domain reducers
 * Pure functions that update state based on actions
 */
import { ActionTypes } from './actions.js';
import { GameRules } from '../../domain/rules/GameRules.js';
import { GameState } from '../../domain/state/GameState.js';
import { RotationInitializer } from '../../game/RotationInitializer.js';

// Initial game settings
const defaultSettings = {
    dimensions: 4,
    gridSize: 4,
};

// Initial state structure
export const initialState = {
    game: {
        ...GameState.initial(defaultSettings).toPlain(),
        redoStack: [], // Stack of moves that can be redone
    },
    settings: defaultSettings,
    visual: {
        rotation: RotationInitializer.createRotations(defaultSettings.dimensions),
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
 * Integrates with Domain Layer (GameRules)
 * @param {Object} state - Current game state (plain object)
 * @param {Object} action - Action to process
 * @param {Object} rootState - Full root state (for cross-slice access if needed)
 * @returns {Object} New game state (plain object)
 */
function gameReducer(state = initialState.game, action, rootState) {
    // Convert plain state to GameState
    const gameState = GameState.fromPlain(state);

    switch (action.type) {
        case ActionTypes.PLACE_MARKER: {
            const { position, player } = action.payload;
            const newGameState = GameRules.placeMarker(gameState, position, player);
            return {
                ...newGameState.toPlain(),
                redoStack: [], // Clear redo stack on new move
            };
        }

        case ActionTypes.SWITCH_PLAYER: {
            const nextPlayer = GameRules.nextPlayer(gameState.currentPlayer);
            return gameState.withPlayer(nextPlayer).toPlain();
        }

        case ActionTypes.SET_GAME_PHASE:
            return {
                ...state,
                gamePhase: action.payload.phase
            };

        case ActionTypes.SET_WINNER:
            return gameState.withWinner(action.payload.winner).toPlain();

        case ActionTypes.RESET_GAME: {
            const settings = action.payload.settings || rootState.settings;
            const newGameState = GameRules.reset(GameState.initial(settings));
            return {
                ...newGameState.toPlain(),
                redoStack: [], // Clear redo stack on reset
            };
        }

        case ActionTypes.UNDO_MOVE: {
            if (gameState.moveHistory.length === 0) {
                return state; // Nothing to undo
            }

            // Get the last move before undoing
            const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];

            // Undo the move
            const newGameState = GameRules.undo(gameState);

            // Add undone move to redo stack
            return {
                ...newGameState.toPlain(),
                redoStack: [...(state.redoStack || []), lastMove],
            };
        }

        case ActionTypes.REDO_MOVE: {
            const redoStack = state.redoStack || [];
            if (redoStack.length === 0) {
                return state; // Nothing to redo
            }

            // Get the last undone move
            const moveToRedo = redoStack[redoStack.length - 1];

            // Replay the move
            const newGameState = GameRules.placeMarker(
                gameState,
                moveToRedo.position,
                moveToRedo.player
            );

            // Remove from redo stack
            return {
                ...newGameState.toPlain(),
                redoStack: redoStack.slice(0, -1),
            };
        }

        case ActionTypes.UPDATE_SETTINGS: {
            // When settings change, reset the game
            const newSettings = action.payload.settings;
            const newGameState = GameRules.updateSettings(gameState, newSettings);
            return newGameState.toPlain();
        }

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

        case ActionTypes.UPDATE_SETTINGS:
            // When dimensions change, reinitialize rotation axes
            const newDimensions = action.payload.settings.dimensions;
            if (newDimensions !== undefined && newDimensions !== rootState.settings.dimensions) {
                return {
                    ...state,
                    rotation: RotationInitializer.createRotations(newDimensions)
                };
            }
            return state;

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
