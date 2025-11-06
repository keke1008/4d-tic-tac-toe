/**
 * BoardState unit tests
 */
import { describe, it, expect } from 'vitest';
import { BoardState } from '../../../js/domain/state/BoardState.js';

describe('BoardState', () => {
    describe('constructor and empty', () => {
        it('should create empty 2D board', () => {
            const board = BoardState.empty(2, 3);

            expect(board.dimensions).toBe(2);
            expect(board.gridSize).toBe(3);
            expect(board.get([0, 0])).toBe(null);
        });

        it('should create empty 4D board with array storage', () => {
            const board = BoardState.empty(4, 4);

            expect(board.dimensions).toBe(4);
            expect(board.gridSize).toBe(4);
            expect(board._storage instanceof Map).toBe(false);
        });

        it('should create empty 5D board with Map storage', () => {
            const board = BoardState.empty(5, 3);

            expect(board.dimensions).toBe(5);
            expect(board.gridSize).toBe(3);
            expect(board._storage instanceof Map).toBe(true);
        });
    });

    describe('get', () => {
        it('should get value from 2D board', () => {
            const board = BoardState.empty(2, 3);

            expect(board.get([0, 0])).toBe(null);
            expect(board.get([1, 2])).toBe(null);
        });

        it('should get value from 4D board', () => {
            const board = BoardState.empty(4, 4);

            expect(board.get([0, 0, 0, 0])).toBe(null);
            expect(board.get([1, 2, 3, 0])).toBe(null);
        });

        it('should get value from 5D Map board', () => {
            const board = BoardState.empty(5, 3);

            expect(board.get([0, 0, 0, 0, 0])).toBe(null);
            expect(board.get([1, 2, 1, 0, 2])).toBe(null);
        });

        it('should return null for out of bounds', () => {
            const board = BoardState.empty(2, 3);

            expect(board.get([10, 10])).toBe(null);
        });
    });

    describe('set', () => {
        it('should set value in 2D board', () => {
            const board = BoardState.empty(2, 3);
            const newBoard = board.set([1, 1], 'X');

            expect(newBoard.get([1, 1])).toBe('X');
            expect(board.get([1, 1])).toBe(null); // Original unchanged
        });

        it('should set value in 4D board', () => {
            const board = BoardState.empty(4, 3);
            const newBoard = board.set([1, 2, 0, 1], 'O');

            expect(newBoard.get([1, 2, 0, 1])).toBe('O');
            expect(board.get([1, 2, 0, 1])).toBe(null);
        });

        it('should set value in 5D Map board', () => {
            const board = BoardState.empty(5, 3);
            const newBoard = board.set([0, 1, 2, 1, 0], 'X');

            expect(newBoard.get([0, 1, 2, 1, 0])).toBe('X');
            expect(board.get([0, 1, 2, 1, 0])).toBe(null);
        });

        it('should allow multiple sets', () => {
            let board = BoardState.empty(2, 3);

            board = board.set([0, 0], 'X');
            board = board.set([1, 1], 'O');
            board = board.set([2, 2], 'X');

            expect(board.get([0, 0])).toBe('X');
            expect(board.get([1, 1])).toBe('O');
            expect(board.get([2, 2])).toBe('X');
        });
    });

    describe('isEmpty', () => {
        it('should check if position is empty', () => {
            const board = BoardState.empty(2, 3);

            expect(board.isEmpty([0, 0])).toBe(true);

            const newBoard = board.set([0, 0], 'X');
            expect(newBoard.isEmpty([0, 0])).toBe(false);
            expect(newBoard.isEmpty([1, 1])).toBe(true);
        });
    });

    describe('isFull', () => {
        it('should check if 2D board is full', () => {
            let board = BoardState.empty(2, 2);

            expect(board.isFull()).toBe(false);

            board = board.set([0, 0], 'X');
            board = board.set([0, 1], 'O');
            board = board.set([1, 0], 'X');
            expect(board.isFull()).toBe(false);

            board = board.set([1, 1], 'O');
            expect(board.isFull()).toBe(true);
        });

        it('should check if 5D Map board is full', () => {
            let board = BoardState.empty(5, 2); // 2^5 = 32 cells

            expect(board.isFull()).toBe(false);

            // Fill all 32 cells
            for (let a = 0; a < 2; a++) {
                for (let b = 0; b < 2; b++) {
                    for (let c = 0; c < 2; c++) {
                        for (let d = 0; d < 2; d++) {
                            for (let e = 0; e < 2; e++) {
                                board = board.set([a, b, c, d, e], 'X');
                            }
                        }
                    }
                }
            }

            expect(board.isFull()).toBe(true);
        });
    });

    describe('immutability', () => {
        it('should not mutate original board on set', () => {
            const original = BoardState.empty(2, 3);
            const modified = original.set([0, 0], 'X');

            expect(original.get([0, 0])).toBe(null);
            expect(modified.get([0, 0])).toBe('X');
            expect(modified).not.toBe(original);
        });

        it('should be frozen', () => {
            const board = BoardState.empty(2, 3);

            expect(Object.isFrozen(board)).toBe(true);
        });
    });

    describe('toPlain and fromPlain', () => {
        it('should convert array board to plain and back', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([1, 1], 'O');

            const plain = board.toPlain();
            const restored = BoardState.fromPlain(plain);

            expect(restored.dimensions).toBe(board.dimensions);
            expect(restored.gridSize).toBe(board.gridSize);
            expect(restored.get([0, 0])).toBe('X');
            expect(restored.get([1, 1])).toBe('O');
        });

        it('should convert Map board to plain and back', () => {
            let board = BoardState.empty(5, 3);
            board = board.set([0, 1, 2, 1, 0], 'X');
            board = board.set([2, 2, 2, 2, 2], 'O');

            const plain = board.toPlain();
            const restored = BoardState.fromPlain(plain);

            expect(restored.dimensions).toBe(board.dimensions);
            expect(restored.gridSize).toBe(board.gridSize);
            expect(restored.get([0, 1, 2, 1, 0])).toBe('X');
            expect(restored.get([2, 2, 2, 2, 2])).toBe('O');
        });
    });
});
