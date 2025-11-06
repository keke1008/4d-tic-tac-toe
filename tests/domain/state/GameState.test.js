/**
 * GameState unit tests
 */
import { describe, it, expect } from 'vitest';
import { GameState } from '../../../js/domain/state/GameState.js';
import { BoardState } from '../../../js/domain/state/BoardState.js';

describe('GameState', () => {
    describe('initial', () => {
        it('should create initial game state', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });

            expect(state.currentPlayer).toBe('X');
            expect(state.gamePhase).toBe('playing');
            expect(state.winner).toBe(null);
            expect(state.moveHistory).toEqual([]);
            expect(state.settings).toEqual({ dimensions: 2, gridSize: 3 });
            expect(state.board).toBeDefined();
        });

        it('should create initial state with different dimensions', () => {
            const state = GameState.initial({ dimensions: 4, gridSize: 4 });

            expect(state.settings.dimensions).toBe(4);
            expect(state.settings.gridSize).toBe(4);
        });
    });

    describe('withMarker', () => {
        it('should place marker and update history', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });
            const newState = state.withMarker([0, 0], 'X');

            expect(newState.getMarkerAt([0, 0])).toBe('X');
            expect(newState.moveHistory).toHaveLength(1);
            expect(newState.moveHistory[0].position).toEqual([0, 0]);
            expect(newState.moveHistory[0].player).toBe('X');
            expect(newState.moveHistory[0].timestamp).toBeDefined();
        });

        it('should not mutate original state', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });
            const newState = state.withMarker([0, 0], 'X');

            expect(state.getMarkerAt([0, 0])).toBe(null);
            expect(state.moveHistory).toHaveLength(0);
        });
    });

    describe('withPlayer', () => {
        it('should change current player', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });

            const newState = state.withPlayer('O');
            expect(newState.currentPlayer).toBe('O');
            expect(state.currentPlayer).toBe('X'); // Original unchanged
        });
    });

    describe('withWinner', () => {
        it('should mark game as won', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });
            const newState = state.withWinner('X');

            expect(newState.gamePhase).toBe('won');
            expect(newState.winner).toBe('X');
        });
    });

    describe('withDraw', () => {
        it('should mark game as draw', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });
            const newState = state.withDraw();

            expect(newState.gamePhase).toBe('draw');
            expect(newState.winner).toBe(null);
        });
    });

    describe('getMarkerAt', () => {
        it('should get marker at position', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });

            expect(state.getMarkerAt([0, 0])).toBe(null);

            state = state.withMarker([0, 0], 'X');
            expect(state.getMarkerAt([0, 0])).toBe('X');
        });
    });

    describe('isValidMove', () => {
        it('should validate moves during play', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });

            expect(state.isValidMove([0, 0])).toBe(true);

            state = state.withMarker([0, 0], 'X');
            expect(state.isValidMove([0, 0])).toBe(false); // Occupied
            expect(state.isValidMove([1, 1])).toBe(true);  // Empty
        });

        it('should reject moves when game is over', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });
            state = state.withWinner('X');

            expect(state.isValidMove([0, 0])).toBe(false);
        });
    });

    describe('isBoardFull', () => {
        it('should check if board is full', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 2 });

            expect(state.isBoardFull()).toBe(false);

            state = state.withMarker([0, 0], 'X');
            state = state.withMarker([0, 1], 'O');
            state = state.withMarker([1, 0], 'X');
            expect(state.isBoardFull()).toBe(false);

            state = state.withMarker([1, 1], 'O');
            expect(state.isBoardFull()).toBe(true);
        });
    });

    describe('isGameOver', () => {
        it('should detect game over status', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });

            expect(state.isGameOver()).toBe(false);

            state = state.withWinner('X');
            expect(state.isGameOver()).toBe(true);

            state = GameState.initial({ dimensions: 2, gridSize: 3 });
            state = state.withDraw();
            expect(state.isGameOver()).toBe(true);
        });
    });

    describe('immutability', () => {
        it('should be frozen', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });

            expect(Object.isFrozen(state)).toBe(true);
        });

        it('should return new instance on withMarker', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });
            const newState = state.withMarker([0, 0], 'X');

            expect(newState).not.toBe(state);
        });
    });

    describe('toPlain and fromPlain', () => {
        it('should convert to plain object and back', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });
            state = state.withMarker([0, 0], 'X');
            state = state.withMarker([1, 1], 'O');
            state = state.withPlayer('X');

            const plain = state.toPlain();
            const restored = GameState.fromPlain(plain);

            expect(restored.currentPlayer).toBe(state.currentPlayer);
            expect(restored.gamePhase).toBe(state.gamePhase);
            expect(restored.getMarkerAt([0, 0])).toBe('X');
            expect(restored.getMarkerAt([1, 1])).toBe('O');
            expect(restored.moveHistory).toHaveLength(2);
        });
    });
});
