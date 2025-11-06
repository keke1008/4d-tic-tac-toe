/**
 * Performance benchmarks for critical operations
 */
import { describe, it, expect } from 'vitest';
import { GameState } from '../../js/domain/state/GameState.js';
import { BoardState } from '../../js/domain/state/BoardState.js';
import { GameRules } from '../../js/domain/rules/GameRules.js';
import { WinChecker } from '../../js/domain/rules/WinChecker.js';

describe('Performance Benchmarks', () => {
    describe('BoardState operations', () => {
        it('should benchmark 4D board creation', () => {
            const start = performance.now();

            for (let i = 0; i < 100; i++) {
                BoardState.empty(4, 4);
            }

            const end = performance.now();
            const avgTime = (end - start) / 100;

            console.log(`4D board creation: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(10); // Should be under 10ms
        });

        it('should benchmark 4D board set operation', () => {
            const board = BoardState.empty(4, 4);
            const start = performance.now();

            let currentBoard = board;
            for (let i = 0; i < 100; i++) {
                currentBoard = currentBoard.set([i % 4, 0, 0, 0], 'X');
            }

            const end = performance.now();
            const avgTime = (end - start) / 100;

            console.log(`4D board set: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(5);
        });

        it('should benchmark 6D Map-based board', () => {
            const start = performance.now();

            for (let i = 0; i < 100; i++) {
                const board = BoardState.empty(6, 3);
                board.set([0, 0, 0, 0, 0, 0], 'X');
            }

            const end = performance.now();
            const avgTime = (end - start) / 100;

            console.log(`6D Map-based board operations: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(1);
        });
    });

    describe('WinChecker performance', () => {
        it('should benchmark direction generation', () => {
            const dimensions = [2, 3, 4, 5, 6];

            dimensions.forEach(dim => {
                const start = performance.now();

                for (let i = 0; i < 100; i++) {
                    WinChecker.generateDirections(dim);
                }

                const end = performance.now();
                const avgTime = (end - start) / 100;
                const dirCount = WinChecker.getDirectionCount(dim);

                console.log(`${dim}D direction generation (${dirCount} dirs): ${avgTime.toFixed(3)}ms`);
            });
        });

        it('should benchmark win checking in 4D', () => {
            const settings = { dimensions: 4, gridSize: 4 };
            let board = BoardState.empty(4, 4);

            // Create a line
            board = board.set([0, 0, 0, 0], 'X');
            board = board.set([1, 0, 0, 0], 'X');
            board = board.set([2, 0, 0, 0], 'X');
            board = board.set([3, 0, 0, 0], 'X');

            const start = performance.now();

            for (let i = 0; i < 100; i++) {
                WinChecker.hasWinningLine(board, [1, 0, 0, 0], 'X', settings);
            }

            const end = performance.now();
            const avgTime = (end - start) / 100;

            console.log(`4D win checking: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(5);
        });
    });

    describe('GameState operations', () => {
        it('should benchmark placeMarker with full game logic', () => {
            const settings = { dimensions: 4, gridSize: 4 };
            const initialState = GameState.initial(settings);

            const start = performance.now();

            let state = initialState;
            for (let i = 0; i < 50; i++) {
                const pos = [i % 4, 0, 0, 0];
                state = GameRules.placeMarker(state, pos);
            }

            const end = performance.now();
            const avgTime = (end - start) / 50;

            console.log(`PlaceMarker with win check: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(10);
        });

        it('should benchmark undo operation', () => {
            const settings = { dimensions: 4, gridSize: 4 };
            let state = GameState.initial(settings);

            // Make 20 moves
            for (let i = 0; i < 20; i++) {
                const pos = [i % 4, Math.floor(i / 4) % 4, 0, 0];
                state = GameRules.placeMarker(state, pos);
            }

            const start = performance.now();

            for (let i = 0; i < 20; i++) {
                state = GameRules.undo(state);
            }

            const end = performance.now();
            const avgTime = (end - start) / 20;

            console.log(`Undo operation: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(20);
        });
    });

    describe('toPlain/fromPlain serialization', () => {
        it('should benchmark GameState serialization', () => {
            const settings = { dimensions: 4, gridSize: 4 };
            let state = GameState.initial(settings);

            // Make some moves
            for (let i = 0; i < 10; i++) {
                const pos = [i % 4, 0, 0, 0];
                state = GameRules.placeMarker(state, pos);
            }

            const start = performance.now();

            for (let i = 0; i < 100; i++) {
                const plain = state.toPlain();
                GameState.fromPlain(plain);
            }

            const end = performance.now();
            const avgTime = (end - start) / 100;

            console.log(`toPlain/fromPlain cycle: ${avgTime.toFixed(3)}ms per operation`);
            expect(avgTime).toBeLessThan(5);
        });
    });

    describe('Memory usage estimation', () => {
        it('should estimate 4D board memory', () => {
            const board4D = BoardState.empty(4, 4);

            // Rough estimation: 4^4 = 256 cells
            const cellCount = Math.pow(4, 4);
            const estimatedBytes = cellCount * 8; // 8 bytes per pointer/null

            console.log(`4D 4x4 board: ~${cellCount} cells, ~${(estimatedBytes / 1024).toFixed(2)}KB`);
        });

        it('should estimate GameState with history', () => {
            const settings = { dimensions: 4, gridSize: 4 };
            let state = GameState.initial(settings);

            // Simulate 50 moves
            for (let i = 0; i < 50; i++) {
                const pos = [i % 4, Math.floor(i / 4) % 4, 0, 0];
                state = GameRules.placeMarker(state, pos);
            }

            const plain = state.toPlain();
            const jsonString = JSON.stringify(plain);
            const bytes = new TextEncoder().encode(jsonString).length;

            console.log(`GameState with 50 moves: ${(bytes / 1024).toFixed(2)}KB as JSON`);
            console.log(`Move history length: ${state.moveHistory.length}`);
        });

        it('should compare array vs Map storage', () => {
            // 4D with array
            const board4D = BoardState.empty(4, 4);
            let board4DModified = board4D;
            for (let i = 0; i < 10; i++) {
                board4DModified = board4DModified.set([i % 4, 0, 0, 0], 'X');
            }

            // 6D with Map
            const board6D = BoardState.empty(6, 3);
            let board6DModified = board6D;
            for (let i = 0; i < 10; i++) {
                board6DModified = board6DModified.set([i % 3, 0, 0, 0, 0, 0], 'X');
            }

            const json4D = JSON.stringify(board4DModified.toPlain());
            const json6D = JSON.stringify(board6DModified.toPlain());

            const bytes4D = new TextEncoder().encode(json4D).length;
            const bytes6D = new TextEncoder().encode(json6D).length;

            console.log(`4D board (${Math.pow(4, 4)} potential cells): ${(bytes4D / 1024).toFixed(2)}KB`);
            console.log(`6D board (${Math.pow(3, 6)} potential cells): ${(bytes6D / 1024).toFixed(2)}KB`);
            console.log(`Map storage advantage: ${((bytes4D - bytes6D) / bytes4D * 100).toFixed(1)}% smaller`);
        });
    });
});
