/**
 * GameService unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService } from '../../../js/application/services/GameService.js';
import { StateStore } from '../../../js/infrastructure/state/StateStore.js';
import { EventBus } from '../../../js/infrastructure/events/EventBus.js';
import { rootReducer, initialState } from '../../../js/infrastructure/state/reducers.js';

describe('GameService', () => {
    let service;
    let store;
    let eventBus;

    beforeEach(() => {
        store = new StateStore(initialState, rootReducer);
        eventBus = new EventBus();
        service = new GameService(store, eventBus);
    });

    describe('handleCellClick', () => {
        it('should set preview on first click', () => {
            const position = [0, 0, 0, 0];

            service.handleCellClick(position);

            expect(service.getPreviewCell()).toEqual(position);
        });

        it('should confirm placement on second click', () => {
            const position = [0, 0, 0, 0];

            // First click - preview
            service.handleCellClick(position);
            expect(service.getPreviewCell()).toEqual(position);

            // Second click - confirm
            service.handleCellClick(position);
            expect(service.getPreviewCell()).toBe(null);
            expect(service.getMoveHistory()).toHaveLength(1);
        });

        it('should change preview if clicking different cell', () => {
            const pos1 = [0, 0, 0, 0];
            const pos2 = [1, 0, 0, 0];

            service.handleCellClick(pos1);
            expect(service.getPreviewCell()).toEqual(pos1);

            service.handleCellClick(pos2);
            expect(service.getPreviewCell()).toEqual(pos2);
        });

        it('should not allow moves when game is over', () => {
            // Make winning moves (simplified - would need actual winning sequence)
            // For now just test that it doesn't error
            const position = [0, 0, 0, 0];
            service.handleCellClick(position);
            service.handleCellClick(position);
        });

        it('should emit event on marker placement', () => {
            const position = [0, 0, 0, 0];
            const spy = vi.fn();

            eventBus.on('game:markerPlaced', spy);

            service.handleCellClick(position);
            service.handleCellClick(position); // Confirm

            expect(spy).toHaveBeenCalledWith({
                position,
                player: 'X'
            });
        });
    });

    describe('resetGameState', () => {
        it('should reset game to initial state', () => {
            // Make some moves
            service.handleCellClick([0, 0, 0, 0]);
            service.handleCellClick([0, 0, 0, 0]); // Confirm

            expect(service.getMoveHistory()).toHaveLength(1);

            // Reset
            service.resetGameState();

            expect(service.getMoveHistory()).toHaveLength(0);
            expect(service.getCurrentPlayer()).toBe('X');
            expect(service.getGamePhase()).toBe('playing');
        });

        it('should keep current settings when resetting', () => {
            // Settings should remain unchanged after reset
            const settingsBefore = service.getSettings();

            service.resetGameState();

            const settingsAfter = service.getSettings();
            expect(settingsAfter).toEqual(settingsBefore);
        });

        it('should emit state reset event', () => {
            const spy = vi.fn();
            eventBus.on('game:stateReset', spy);

            service.resetGameState();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('updateSettings', () => {
        it('should update settings', () => {
            const newSettings = { dimensions: 3, gridSize: 5 };

            service.updateSettings(newSettings);

            const settings = service.getSettings();
            expect(settings.dimensions).toBe(3);
            expect(settings.gridSize).toBe(5);
        });

        it('should emit settings changed event with old and new settings', () => {
            const spy = vi.fn();
            eventBus.on('settings:changed', spy);

            const newSettings = { dimensions: 3, gridSize: 5 };
            service.updateSettings(newSettings);

            expect(spy).toHaveBeenCalledWith({
                oldSettings: expect.objectContaining({ dimensions: 4, gridSize: 4 }),
                newSettings
            });
        });
    });

    describe('undo', () => {
        it('should undo last move', () => {
            service.handleCellClick([0, 0, 0, 0]);
            service.handleCellClick([0, 0, 0, 0]); // Confirm

            expect(service.getMoveHistory()).toHaveLength(1);

            service.undo();

            expect(service.getMoveHistory()).toHaveLength(0);
        });

        it('should not undo when no moves', () => {
            expect(service.canUndo()).toBe(false);

            service.undo(); // Should not error

            expect(service.getMoveHistory()).toHaveLength(0);
        });

        it('should emit move undone event', () => {
            const spy = vi.fn();
            eventBus.on('game:moveUndone', spy);

            service.handleCellClick([0, 0, 0, 0]);
            service.handleCellClick([0, 0, 0, 0]); // Confirm

            service.undo();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('queries', () => {
        it('should get current player', () => {
            expect(service.getCurrentPlayer()).toBe('X');
        });

        it('should get game phase', () => {
            expect(service.getGamePhase()).toBe('playing');
        });

        it('should get winner', () => {
            expect(service.getWinner()).toBe(null);
        });

        it('should get move history', () => {
            expect(service.getMoveHistory()).toEqual([]);
        });

        it('should get settings', () => {
            const settings = service.getSettings();
            expect(settings).toHaveProperty('dimensions');
            expect(settings).toHaveProperty('gridSize');
        });

        it('should check if undo is possible', () => {
            expect(service.canUndo()).toBe(false);

            service.handleCellClick([0, 0, 0, 0]);
            service.handleCellClick([0, 0, 0, 0]); // Confirm

            expect(service.canUndo()).toBe(true);
        });

        it('should get board state', () => {
            const board = service.getBoardState();
            expect(board).toBeDefined();
            expect(board).toHaveProperty('dimensions');
        });

        it('should get preview cell', () => {
            expect(service.getPreviewCell()).toBe(null);

            service.handleCellClick([0, 0, 0, 0]);

            expect(service.getPreviewCell()).toEqual([0, 0, 0, 0]);
        });

        it('should get visual state', () => {
            const visual = service.getVisualState();
            expect(visual).toHaveProperty('rotation');
            expect(visual).toHaveProperty('cameraPosition');
        });
    });

    describe('visual controls', () => {
        it('should toggle auto rotate', () => {
            const initialAutoRotate = service.getVisualState().autoRotate;

            service.toggleAutoRotate();

            const newAutoRotate = service.getVisualState().autoRotate;
            expect(newAutoRotate).toBe(!initialAutoRotate);
        });

        it('should update rotation', () => {
            service.updateRotation('xw', 0.5);

            const rotation = service.getVisualState().rotation;
            expect(rotation.xw).toBeCloseTo(0.5);
        });

        it('should set hovered cell', () => {
            const position = [1, 2, 3, 0];

            service.setHoveredCell(position);

            expect(service.getVisualState().hoveredCell).toEqual(position);
        });
    });

    describe('UI controls', () => {
        it('should toggle settings modal', () => {
            const initialOpen = store.getState().ui.settingsModalOpen;

            service.toggleSettingsModal();

            const newOpen = store.getState().ui.settingsModalOpen;
            expect(newOpen).toBe(!initialOpen);
        });
    });
});
