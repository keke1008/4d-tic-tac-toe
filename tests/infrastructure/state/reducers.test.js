/**
 * Reducers unit tests
 */
import { describe, it, expect } from 'vitest';
import { rootReducer, initialState } from '../../../js/infrastructure/state/reducers.js';
import { Actions, ActionTypes } from '../../../js/infrastructure/state/actions.js';

describe('Reducers', () => {
    describe('rootReducer', () => {
        it('should return initial state when called with undefined', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            expect(state).toEqual(initialState);
        });

        it('should combine all domain reducers', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            expect(state).toHaveProperty('game');
            expect(state).toHaveProperty('settings');
            expect(state).toHaveProperty('visual');
            expect(state).toHaveProperty('ui');
        });

        it('should not mutate original state', () => {
            const originalState = rootReducer(undefined, { type: '@@INIT' });
            const action = Actions.switchPlayer();

            const newState = rootReducer(originalState, action);

            expect(newState).not.toBe(originalState);
            expect(newState.game).not.toBe(originalState.game);
            expect(originalState.game.currentPlayer).toBe('X'); // unchanged
        });
    });

    describe('gameReducer', () => {
        it('should handle PLACE_MARKER action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const action = Actions.placeMarker([0, 0, 0, 0], 'X');

            const newState = rootReducer(state, action);

            expect(newState.game.moveHistory).toHaveLength(1);
            expect(newState.game.moveHistory[0].position).toEqual([0, 0, 0, 0]);
            expect(newState.game.moveHistory[0].player).toBe('X');
            expect(newState.game.moveHistory[0].timestamp).toBeDefined();
        });

        it('should handle SWITCH_PLAYER action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            let newState = rootReducer(state, Actions.switchPlayer());
            expect(newState.game.currentPlayer).toBe('O');

            newState = rootReducer(newState, Actions.switchPlayer());
            expect(newState.game.currentPlayer).toBe('X');
        });

        it('should handle SET_GAME_PHASE action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.setGamePhase('won'));

            expect(newState.game.gamePhase).toBe('won');
        });

        it('should handle SET_WINNER action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.setWinner('X'));

            expect(newState.game.winner).toBe('X');
            expect(newState.game.gamePhase).toBe('won');
        });

        it('should handle RESET_GAME action', () => {
            let state = rootReducer(undefined, { type: '@@INIT' });

            // Make some moves
            state = rootReducer(state, Actions.placeMarker([0, 0], 'X'));
            state = rootReducer(state, Actions.switchPlayer());
            state = rootReducer(state, Actions.setWinner('X'));

            // Reset
            const newState = rootReducer(state, Actions.resetGame());

            expect(newState.game.currentPlayer).toBe('X');
            expect(newState.game.gamePhase).toBe('playing');
            expect(newState.game.winner).toBe(null);
            expect(newState.game.moveHistory).toEqual([]);
        });

        it('should handle UNDO_MOVE action', () => {
            let state = rootReducer(undefined, { type: '@@INIT' });

            state = rootReducer(state, Actions.placeMarker([0, 0, 0, 0], 'X'));
            state = rootReducer(state, Actions.placeMarker([1, 0, 0, 0], 'O'));
            state = rootReducer(state, Actions.placeMarker([0, 1, 0, 0], 'X'));

            expect(state.game.moveHistory).toHaveLength(3);

            state = rootReducer(state, Actions.undoMove());
            expect(state.game.moveHistory).toHaveLength(2);

            state = rootReducer(state, Actions.undoMove());
            expect(state.game.moveHistory).toHaveLength(1);
        });

        it('should not undo when no moves', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.undoMove());

            expect(newState.game.moveHistory).toEqual([]);
        });
    });

    describe('settingsReducer', () => {
        it('should handle UPDATE_SETTINGS action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.updateSettings({
                dimensions: 5,
                gridSize: 3
            }));

            expect(newState.settings.dimensions).toBe(5);
            expect(newState.settings.gridSize).toBe(3);
        });

        it('should handle SET_DIMENSIONS action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.setDimensions(6));

            expect(newState.settings.dimensions).toBe(6);
        });

        it('should handle SET_GRID_SIZE action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.setGridSize(5));

            expect(newState.settings.gridSize).toBe(5);
        });
    });

    describe('visualReducer', () => {
        it('should handle UPDATE_ROTATION action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            let newState = rootReducer(state, Actions.updateRotation('xw', 0.1));
            expect(newState.visual.rotation.xw).toBeCloseTo(0.1);

            newState = rootReducer(newState, Actions.updateRotation('xw', 0.2));
            expect(newState.visual.rotation.xw).toBeCloseTo(0.3);

            newState = rootReducer(newState, Actions.updateRotation('yz', 0.5));
            expect(newState.visual.rotation.yz).toBeCloseTo(0.5);
            expect(newState.visual.rotation.xw).toBeCloseTo(0.3);
        });

        it('should handle SET_ROTATION action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const rotations = { xy: 1.0, xz: 2.0, xw: 3.0 };
            const newState = rootReducer(state, Actions.setRotation(rotations));

            expect(newState.visual.rotation).toEqual(rotations);
        });

        it('should handle SET_CAMERA_POSITION action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const position = { x: 5, y: 10, z: 15 };
            const newState = rootReducer(state, Actions.setCameraPosition(position));

            expect(newState.visual.cameraPosition).toEqual(position);
        });

        it('should handle SET_CAMERA_DISTANCE action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const newState = rootReducer(state, Actions.setCameraDistance(20));

            expect(newState.visual.cameraDistance).toBe(20);
        });

        it('should handle SET_HOVERED_CELL action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const position = [1, 2, 3, 4];
            const newState = rootReducer(state, Actions.setHoveredCell(position));

            expect(newState.visual.hoveredCell).toEqual(position);
        });

        it('should handle SET_PREVIEW_CELL action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });
            const position = [0, 1, 2, 3];
            const newState = rootReducer(state, Actions.setPreviewCell(position));

            expect(newState.visual.previewCell).toEqual(position);
        });

        it('should handle TOGGLE_AUTO_ROTATE action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            expect(state.visual.autoRotate).toBe(true);

            let newState = rootReducer(state, Actions.toggleAutoRotate());
            expect(newState.visual.autoRotate).toBe(false);

            newState = rootReducer(newState, Actions.toggleAutoRotate());
            expect(newState.visual.autoRotate).toBe(true);
        });

        it('should handle SET_AUTO_ROTATE action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            let newState = rootReducer(state, Actions.setAutoRotate(false));
            expect(newState.visual.autoRotate).toBe(false);

            newState = rootReducer(newState, Actions.setAutoRotate(true));
            expect(newState.visual.autoRotate).toBe(true);
        });
    });

    describe('uiReducer', () => {
        it('should handle TOGGLE_SETTINGS_MODAL action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            expect(state.ui.settingsModalOpen).toBe(false);

            let newState = rootReducer(state, Actions.toggleSettingsModal());
            expect(newState.ui.settingsModalOpen).toBe(true);

            newState = rootReducer(newState, Actions.toggleSettingsModal());
            expect(newState.ui.settingsModalOpen).toBe(false);
        });

        it('should handle SET_SETTINGS_MODAL_OPEN action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            let newState = rootReducer(state, Actions.setSettingsModalOpen(true));
            expect(newState.ui.settingsModalOpen).toBe(true);

            newState = rootReducer(newState, Actions.setSettingsModalOpen(false));
            expect(newState.ui.settingsModalOpen).toBe(false);
        });

        it('should handle TOGGLE_HELP_PANEL action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            expect(state.ui.helpPanelOpen).toBe(false);

            let newState = rootReducer(state, Actions.toggleHelpPanel());
            expect(newState.ui.helpPanelOpen).toBe(true);

            newState = rootReducer(newState, Actions.toggleHelpPanel());
            expect(newState.ui.helpPanelOpen).toBe(false);
        });

        it('should handle UPDATE_STATUS action', () => {
            const state = rootReducer(undefined, { type: '@@INIT' });

            let newState = rootReducer(state, Actions.updateStatus('Test message', false));
            expect(newState.ui.status).toBe('Test message');
            expect(newState.ui.isVictoryStatus).toBe(false);

            newState = rootReducer(newState, Actions.updateStatus('Victory!', true));
            expect(newState.ui.status).toBe('Victory!');
            expect(newState.ui.isVictoryStatus).toBe(true);
        });
    });

    describe('integration', () => {
        it('should handle complex state changes', () => {
            let state = rootReducer(undefined, { type: '@@INIT' });

            // Game flow
            state = rootReducer(state, Actions.placeMarker([0, 0, 0, 0], 'X'));
            state = rootReducer(state, Actions.switchPlayer());
            state = rootReducer(state, Actions.updateStatus('プレイヤー O のターン'));

            expect(state.game.currentPlayer).toBe('X'); // After X's move, it's O's turn, then we switch to X
            expect(state.game.moveHistory).toHaveLength(1);
            expect(state.ui.status).toBe('プレイヤー O のターン');

            // Visual changes
            state = rootReducer(state, Actions.updateRotation('xw', 0.1));
            state = rootReducer(state, Actions.setHoveredCell([1, 1, 1, 1]));

            expect(state.visual.rotation.xw).toBeCloseTo(0.1);
            expect(state.visual.hoveredCell).toEqual([1, 1, 1, 1]);

            // Settings change (dimensions change resets rotation axes)
            state = rootReducer(state, Actions.updateSettings({ dimensions: 5 }));
            expect(state.settings.dimensions).toBe(5);
            // Note: rotation is reinitialized when dimensions change
            expect(state.visual.rotation.xw).toBeDefined(); // Axis exists for 5D
            expect(state.visual.rotation.xw).toBeCloseTo(0); // But reset to 0

            // Reset
            state = rootReducer(state, Actions.resetGame());
            expect(state.game.currentPlayer).toBe('X');
            expect(state.game.moveHistory).toEqual([]);

            // Settings should persist, hoveredCell cleared on reset
            expect(state.settings.dimensions).toBe(5);
            expect(state.visual.hoveredCell).toEqual([1, 1, 1, 1]); // Visual state persists through game reset
        });
    });
});
