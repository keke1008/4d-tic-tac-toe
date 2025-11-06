/**
 * GameRules unit tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameRules } from '../../../js/domain/rules/GameRules.js';
import { GameState } from '../../../js/domain/state/GameState.js';
import { BoardState } from '../../../js/domain/state/BoardState.js';

describe('GameRules', () => {
    let initialState;

    beforeEach(() => {
        initialState = GameState.initial({
            dimensions: 2,
            gridSize: 3
        });
    });

    describe('placeMarker', () => {
        it('should place marker on empty cell', () => {
            const newState = GameRules.placeMarker(initialState, [0, 0]);

            expect(newState.board.get([0, 0])).toBe('X');
            expect(newState.moveHistory).toHaveLength(1);
            expect(newState.moveHistory[0].position).toEqual([0, 0]);
            expect(newState.moveHistory[0].player).toBe('X');
        });

        it('should use current player if not specified', () => {
            const newState = GameRules.placeMarker(initialState, [0, 0]);

            expect(newState.board.get([0, 0])).toBe('X');
            expect(newState.currentPlayer).toBe('O'); // Switched to O
        });

        it('should use specified player', () => {
            const newState = GameRules.placeMarker(initialState, [0, 0], 'O');

            expect(newState.board.get([0, 0])).toBe('O');
        });

        it('should not place marker on occupied cell', () => {
            let state = GameRules.placeMarker(initialState, [0, 0], 'X');
            const before = state;

            state = GameRules.placeMarker(state, [0, 0], 'O');

            expect(state).toBe(before); // State unchanged
            expect(state.board.get([0, 0])).toBe('X'); // Still X
        });

        it('should switch player after valid move', () => {
            let state = GameRules.placeMarker(initialState, [0, 0]);

            expect(state.currentPlayer).toBe('O');

            state = GameRules.placeMarker(state, [1, 0]);
            expect(state.currentPlayer).toBe('X');
        });

        it('should detect horizontal win', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'X');
            state = GameRules.placeMarker(state, [2, 0], 'X');

            expect(state.gamePhase).toBe('won');
            expect(state.winner).toBe('X');
        });

        it('should detect vertical win', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [0, 1], 'X');
            state = GameRules.placeMarker(state, [0, 2], 'X');

            expect(state.gamePhase).toBe('won');
            expect(state.winner).toBe('X');
        });

        it('should detect diagonal win', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 1], 'X');
            state = GameRules.placeMarker(state, [2, 2], 'X');

            expect(state.gamePhase).toBe('won');
            expect(state.winner).toBe('X');
        });

        it('should detect draw when board is full', () => {
            let state = initialState;

            // Fill board without winning
            // X O X
            // X O O
            // O X X
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');
            state = GameRules.placeMarker(state, [2, 0], 'X');
            state = GameRules.placeMarker(state, [0, 1], 'X');
            state = GameRules.placeMarker(state, [1, 1], 'O');
            state = GameRules.placeMarker(state, [2, 1], 'O');
            state = GameRules.placeMarker(state, [0, 2], 'O');
            state = GameRules.placeMarker(state, [1, 2], 'X');
            state = GameRules.placeMarker(state, [2, 2], 'X');

            expect(state.gamePhase).toBe('draw');
            expect(state.winner).toBe(null);
        });

        it('should not allow move on invalid position', () => {
            const state = GameRules.placeMarker(initialState, [10, 10], 'X');

            expect(state).toBe(initialState); // Unchanged
        });
    });

    describe('nextPlayer', () => {
        it('should switch from X to O', () => {
            expect(GameRules.nextPlayer('X')).toBe('O');
        });

        it('should switch from O to X', () => {
            expect(GameRules.nextPlayer('O')).toBe('X');
        });
    });

    describe('reset', () => {
        it('should reset game to initial state', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');
            state = GameRules.placeMarker(state, [2, 0], 'X');

            const resetState = GameRules.reset(state);

            expect(resetState.currentPlayer).toBe('X');
            expect(resetState.gamePhase).toBe('playing');
            expect(resetState.winner).toBe(null);
            expect(resetState.moveHistory).toEqual([]);
            expect(resetState.board.isFull()).toBe(false);
        });

        it('should preserve settings after reset', () => {
            const state = GameState.initial({
                dimensions: 4,
                gridSize: 4
            });

            const resetState = GameRules.reset(state);

            expect(resetState.settings.dimensions).toBe(4);
            expect(resetState.settings.gridSize).toBe(4);
        });
    });

    describe('updateSettings', () => {
        it('should create new state with updated settings', () => {
            const state = initialState;

            const newState = GameRules.updateSettings(state, {
                dimensions: 3,
                gridSize: 4
            });

            expect(newState.settings.dimensions).toBe(3);
            expect(newState.settings.gridSize).toBe(4);
            expect(newState.currentPlayer).toBe('X');
            expect(newState.gamePhase).toBe('playing');
        });

        it('should reset game when updating settings', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');

            const newState = GameRules.updateSettings(state, {
                dimensions: 3,
                gridSize: 3
            });

            expect(newState.moveHistory).toEqual([]);
            expect(newState.board.isFull()).toBe(false);
        });
    });

    describe('canUndo', () => {
        it('should return false for initial state', () => {
            expect(GameRules.canUndo(initialState)).toBe(false);
        });

        it('should return true when moves have been made', () => {
            const state = GameRules.placeMarker(initialState, [0, 0], 'X');

            expect(GameRules.canUndo(state)).toBe(true);
        });

        it('should return false after undoing all moves', () => {
            let state = GameRules.placeMarker(initialState, [0, 0], 'X');
            state = GameRules.undo(state);

            expect(GameRules.canUndo(state)).toBe(false);
        });
    });

    describe('undo', () => {
        it('should not change state if no moves to undo', () => {
            const state = GameRules.undo(initialState);

            expect(state).toBe(initialState);
        });

        it('should undo last move', () => {
            let state = GameRules.placeMarker(initialState, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');

            expect(state.board.get([1, 0])).toBe('O');
            expect(state.moveHistory).toHaveLength(2);

            state = GameRules.undo(state);

            expect(state.board.get([1, 0])).toBe(null);
            expect(state.board.get([0, 0])).toBe('X'); // First move still there
            expect(state.moveHistory).toHaveLength(1);
        });

        it('should restore correct player after undo', () => {
            let state = GameRules.placeMarker(initialState, [0, 0], 'X');
            expect(state.currentPlayer).toBe('O');

            state = GameRules.placeMarker(state, [1, 0], 'O');
            expect(state.currentPlayer).toBe('X');

            state = GameRules.undo(state);
            expect(state.currentPlayer).toBe('O'); // Back to O's turn
        });

        it('should undo multiple moves sequentially', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');
            state = GameRules.placeMarker(state, [2, 0], 'X');

            expect(state.moveHistory).toHaveLength(3);

            state = GameRules.undo(state);
            expect(state.moveHistory).toHaveLength(2);
            expect(state.board.get([2, 0])).toBe(null);

            state = GameRules.undo(state);
            expect(state.moveHistory).toHaveLength(1);
            expect(state.board.get([1, 0])).toBe(null);

            state = GameRules.undo(state);
            expect(state.moveHistory).toHaveLength(0);
            expect(state.board.get([0, 0])).toBe(null);
        });

        it('should correctly rebuild board state from history', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 1], 'O');
            state = GameRules.placeMarker(state, [2, 2], 'X');

            state = GameRules.undo(state);

            // Should have first two moves
            expect(state.board.get([0, 0])).toBe('X');
            expect(state.board.get([1, 1])).toBe('O');
            expect(state.board.get([2, 2])).toBe(null);
        });
    });

    describe('getValidMoves', () => {
        it('should return all positions for empty board', () => {
            const validMoves = GameRules.getValidMoves(initialState);

            expect(validMoves).toHaveLength(9); // 3x3 = 9
        });

        it('should not include occupied positions', () => {
            let state = GameRules.placeMarker(initialState, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 1], 'O');

            const validMoves = GameRules.getValidMoves(state);

            expect(validMoves).toHaveLength(7); // 9 - 2 = 7

            // Check that occupied positions are not in valid moves
            const hasOccupied = validMoves.some(pos =>
                (pos[0] === 0 && pos[1] === 0) || (pos[0] === 1 && pos[1] === 1)
            );
            expect(hasOccupied).toBe(false);
        });

        it('should return empty array when game is won', () => {
            let state = initialState;
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'X');
            state = GameRules.placeMarker(state, [2, 0], 'X');

            expect(state.gamePhase).toBe('won');

            const validMoves = GameRules.getValidMoves(state);

            expect(validMoves).toEqual([]);
        });

        it('should return empty array when game is draw', () => {
            let state = initialState;

            // Fill board
            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');
            state = GameRules.placeMarker(state, [2, 0], 'X');
            state = GameRules.placeMarker(state, [0, 1], 'X');
            state = GameRules.placeMarker(state, [1, 1], 'O');
            state = GameRules.placeMarker(state, [2, 1], 'O');
            state = GameRules.placeMarker(state, [0, 2], 'O');
            state = GameRules.placeMarker(state, [1, 2], 'X');
            state = GameRules.placeMarker(state, [2, 2], 'X');

            expect(state.gamePhase).toBe('draw');

            const validMoves = GameRules.getValidMoves(state);

            expect(validMoves).toEqual([]);
        });

        it('should work with different dimensions', () => {
            const state4d = GameState.initial({
                dimensions: 4,
                gridSize: 2
            });

            const validMoves = GameRules.getValidMoves(state4d);

            expect(validMoves).toHaveLength(16); // 2^4 = 16
        });
    });

    describe('isValidPosition', () => {
        it('should validate correct position', () => {
            const settings = { dimensions: 2, gridSize: 3 };

            expect(GameRules.isValidPosition([0, 0], settings)).toBe(true);
            expect(GameRules.isValidPosition([2, 2], settings)).toBe(true);
            expect(GameRules.isValidPosition([1, 1], settings)).toBe(true);
        });

        it('should reject position with wrong dimensions', () => {
            const settings = { dimensions: 2, gridSize: 3 };

            expect(GameRules.isValidPosition([0, 0, 0], settings)).toBe(false);
            expect(GameRules.isValidPosition([0], settings)).toBe(false);
        });

        it('should reject position with out of bounds coordinates', () => {
            const settings = { dimensions: 2, gridSize: 3 };

            expect(GameRules.isValidPosition([3, 0], settings)).toBe(false);
            expect(GameRules.isValidPosition([0, 3], settings)).toBe(false);
            expect(GameRules.isValidPosition([-1, 0], settings)).toBe(false);
            expect(GameRules.isValidPosition([0, -1], settings)).toBe(false);
        });

        it('should reject non-integer coordinates', () => {
            const settings = { dimensions: 2, gridSize: 3 };

            expect(GameRules.isValidPosition([1.5, 0], settings)).toBe(false);
            expect(GameRules.isValidPosition([0, 2.5], settings)).toBe(false);
        });

        it('should reject non-array positions', () => {
            const settings = { dimensions: 2, gridSize: 3 };

            expect(GameRules.isValidPosition(null, settings)).toBe(false);
            expect(GameRules.isValidPosition(undefined, settings)).toBe(false);
            expect(GameRules.isValidPosition('0,0', settings)).toBe(false);
            expect(GameRules.isValidPosition({ x: 0, y: 0 }, settings)).toBe(false);
        });

        it('should work with different dimensions', () => {
            const settings4d = { dimensions: 4, gridSize: 4 };

            expect(GameRules.isValidPosition([0, 0, 0, 0], settings4d)).toBe(true);
            expect(GameRules.isValidPosition([3, 3, 3, 3], settings4d)).toBe(true);
            expect(GameRules.isValidPosition([4, 0, 0, 0], settings4d)).toBe(false);
        });
    });

    describe('integration', () => {
        it('should handle complete game flow', () => {
            let state = initialState;

            // X plays
            state = GameRules.placeMarker(state, [0, 0]);
            expect(state.currentPlayer).toBe('O');
            expect(state.gamePhase).toBe('playing');

            // O plays
            state = GameRules.placeMarker(state, [0, 1]);
            expect(state.currentPlayer).toBe('X');

            // X plays
            state = GameRules.placeMarker(state, [1, 0]);
            expect(state.currentPlayer).toBe('O');

            // O plays
            state = GameRules.placeMarker(state, [1, 1]);
            expect(state.currentPlayer).toBe('X');

            // X wins
            state = GameRules.placeMarker(state, [2, 0]);
            expect(state.gamePhase).toBe('won');
            expect(state.winner).toBe('X');

            // Cannot make more moves
            const validMoves = GameRules.getValidMoves(state);
            expect(validMoves).toEqual([]);
        });

        it('should handle undo and replay', () => {
            let state = initialState;

            state = GameRules.placeMarker(state, [0, 0], 'X');
            state = GameRules.placeMarker(state, [1, 0], 'O');
            state = GameRules.placeMarker(state, [2, 0], 'X');

            // Undo last move (X's move at [2, 0])
            state = GameRules.undo(state);
            expect(state.board.get([2, 0])).toBe(null);
            // After undo, it should be X's turn again (the player who just undid gets to replay)
            expect(state.currentPlayer).toBe('X');

            // X makes a different move
            state = GameRules.placeMarker(state, [0, 1]);
            expect(state.board.get([0, 1])).toBe('X');
            expect(state.board.get([0, 0])).toBe('X');
            expect(state.board.get([1, 0])).toBe('O');
        });

        it('should maintain immutability throughout', () => {
            const state1 = initialState;
            const state2 = GameRules.placeMarker(state1, [0, 0]);
            const state3 = GameRules.placeMarker(state2, [1, 0]);

            // All states should be different objects
            expect(state1).not.toBe(state2);
            expect(state2).not.toBe(state3);

            // Original states should be unchanged
            expect(state1.moveHistory).toHaveLength(0);
            expect(state2.moveHistory).toHaveLength(1);
            expect(state3.moveHistory).toHaveLength(2);
        });
    });
});
