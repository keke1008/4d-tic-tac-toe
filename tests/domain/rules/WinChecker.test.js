/**
 * WinChecker unit tests
 */
import { describe, it, expect } from 'vitest';
import { WinChecker } from '../../../js/domain/rules/WinChecker.js';
import { BoardState } from '../../../js/domain/state/BoardState.js';

describe('WinChecker', () => {
    describe('generateDirections', () => {
        it('should generate correct number of directions for 2D', () => {
            const directions = WinChecker.generateDirections(2);
            expect(directions).toHaveLength(8); // 3^2 - 1 = 8
        });

        it('should generate correct number of directions for 3D', () => {
            const directions = WinChecker.generateDirections(3);
            expect(directions).toHaveLength(26); // 3^3 - 1 = 26
        });

        it('should generate correct number of directions for 4D', () => {
            const directions = WinChecker.generateDirections(4);
            expect(directions).toHaveLength(80); // 3^4 - 1 = 80
        });

        it('should not include zero vector', () => {
            const directions = WinChecker.generateDirections(2);
            const hasZeroVector = directions.some(dir =>
                dir.every(v => v === 0)
            );
            expect(hasZeroVector).toBe(false);
        });

        it('should include all valid direction combinations', () => {
            const directions = WinChecker.generateDirections(2);

            // Check for some expected directions in 2D
            const hasHorizontal = directions.some(dir =>
                dir[0] === 1 && dir[1] === 0
            );
            const hasVertical = directions.some(dir =>
                dir[0] === 0 && dir[1] === 1
            );
            const hasDiagonal = directions.some(dir =>
                dir[0] === 1 && dir[1] === 1
            );

            expect(hasHorizontal).toBe(true);
            expect(hasVertical).toBe(true);
            expect(hasDiagonal).toBe(true);
        });
    });

    describe('getDirectionCount', () => {
        it('should calculate direction count correctly', () => {
            expect(WinChecker.getDirectionCount(2)).toBe(8);
            expect(WinChecker.getDirectionCount(3)).toBe(26);
            expect(WinChecker.getDirectionCount(4)).toBe(80);
            expect(WinChecker.getDirectionCount(5)).toBe(242);
        });
    });

    describe('isInBounds', () => {
        it('should check bounds correctly', () => {
            expect(WinChecker.isInBounds([0, 0], 3)).toBe(true);
            expect(WinChecker.isInBounds([2, 2], 3)).toBe(true);
            expect(WinChecker.isInBounds([3, 0], 3)).toBe(false);
            expect(WinChecker.isInBounds([-1, 0], 3)).toBe(false);
        });
    });

    describe('hasWinningLine - 2D', () => {
        it('should detect horizontal win', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([1, 0], 'X');
            board = board.set([2, 0], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 0],
                'X',
                { dimensions: 2, gridSize: 3 }
            );

            expect(hasWin).toBe(true);
        });

        it('should detect vertical win', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([0, 1], 'X');
            board = board.set([0, 2], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [0, 1],
                'X',
                { dimensions: 2, gridSize: 3 }
            );

            expect(hasWin).toBe(true);
        });

        it('should detect diagonal win', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([1, 1], 'X');
            board = board.set([2, 2], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 1],
                'X',
                { dimensions: 2, gridSize: 3 }
            );

            expect(hasWin).toBe(true);
        });

        it('should detect anti-diagonal win', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([2, 0], 'X');
            board = board.set([1, 1], 'X');
            board = board.set([0, 2], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 1],
                'X',
                { dimensions: 2, gridSize: 3 }
            );

            expect(hasWin).toBe(true);
        });

        it('should not detect win with only 2 markers', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([1, 0], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 0],
                'X',
                { dimensions: 2, gridSize: 3 }
            );

            expect(hasWin).toBe(false);
        });

        it('should not detect win for different player', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([1, 0], 'X');
            board = board.set([2, 0], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 0],
                'O', // Wrong player
                { dimensions: 2, gridSize: 3 }
            );

            expect(hasWin).toBe(false);
        });
    });

    describe('hasWinningLine - 3D', () => {
        it('should detect 3D diagonal win', () => {
            let board = BoardState.empty(3, 3);
            board = board.set([0, 0, 0], 'X');
            board = board.set([1, 1, 1], 'X');
            board = board.set([2, 2, 2], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 1, 1],
                'X',
                { dimensions: 3, gridSize: 3 }
            );

            expect(hasWin).toBe(true);
        });

        it('should detect win in XY plane', () => {
            let board = BoardState.empty(3, 3);
            board = board.set([0, 0, 1], 'X');
            board = board.set([1, 0, 1], 'X');
            board = board.set([2, 0, 1], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 0, 1],
                'X',
                { dimensions: 3, gridSize: 3 }
            );

            expect(hasWin).toBe(true);
        });
    });

    describe('hasWinningLine - 4D', () => {
        it('should detect 4D win along W axis', () => {
            let board = BoardState.empty(4, 4);
            board = board.set([1, 1, 1, 0], 'X');
            board = board.set([1, 1, 1, 1], 'X');
            board = board.set([1, 1, 1, 2], 'X');
            board = board.set([1, 1, 1, 3], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 1, 1, 2],
                'X',
                { dimensions: 4, gridSize: 4 }
            );

            expect(hasWin).toBe(true);
        });

        it('should detect 4D diagonal win', () => {
            let board = BoardState.empty(4, 4);
            board = board.set([0, 0, 0, 0], 'X');
            board = board.set([1, 1, 1, 1], 'X');
            board = board.set([2, 2, 2, 2], 'X');
            board = board.set([3, 3, 3, 3], 'X');

            const hasWin = WinChecker.hasWinningLine(
                board,
                [1, 1, 1, 1],
                'X',
                { dimensions: 4, gridSize: 4 }
            );

            expect(hasWin).toBe(true);
        });
    });

    describe('checkDirection', () => {
        it('should count in both directions', () => {
            let board = BoardState.empty(2, 5);
            // Place markers: _ X X X _
            board = board.set([1, 0], 'X');
            board = board.set([2, 0], 'X');
            board = board.set([3, 0], 'X');

            const hasWin = WinChecker.checkDirection(
                board,
                [2, 0], // Middle position
                'X',
                [1, 0], // Horizontal direction
                3 // Win length
            );

            expect(hasWin).toBe(true);
        });

        it('should handle edge positions', () => {
            let board = BoardState.empty(2, 3);
            board = board.set([0, 0], 'X');
            board = board.set([1, 0], 'X');
            board = board.set([2, 0], 'X');

            const hasWin = WinChecker.checkDirection(
                board,
                [0, 0], // Edge position
                'X',
                [1, 0],
                3
            );

            expect(hasWin).toBe(true);
        });
    });

    describe('countInDirection', () => {
        it('should count consecutive markers', () => {
            let board = BoardState.empty(2, 5);
            board = board.set([0, 0], 'X');
            board = board.set([1, 0], 'X');
            board = board.set([2, 0], 'X');

            const count = WinChecker.countInDirection(
                board,
                [0, 0],
                'X',
                [1, 0],
                5,
                1 // Positive direction
            );

            expect(count).toBe(2); // Two more after start (1,0) and (2,0)
        });

        it('should stop at different marker', () => {
            let board = BoardState.empty(2, 5);
            board = board.set([0, 0], 'X');
            board = board.set([1, 0], 'X');
            board = board.set([2, 0], 'O'); // Different player
            board = board.set([3, 0], 'X');

            const count = WinChecker.countInDirection(
                board,
                [0, 0],
                'X',
                [1, 0],
                5,
                1
            );

            expect(count).toBe(1); // Only (1,0)
        });
    });
});
