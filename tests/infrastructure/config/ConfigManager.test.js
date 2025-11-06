/**
 * ConfigManager unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager, gameConfigValidators } from '../../../js/infrastructure/config/ConfigManager.js';

describe('ConfigManager', () => {
    let configManager;

    beforeEach(() => {
        configManager = new ConfigManager(
            { dimensions: 4, gridSize: 4 },
            {}
        );
    });

    describe('constructor', () => {
        it('should initialize with initial config', () => {
            expect(configManager.get('dimensions')).toBe(4);
            expect(configManager.get('gridSize')).toBe(4);
        });

        it('should work with empty initial config', () => {
            const manager = new ConfigManager();
            expect(manager.getAll()).toEqual({});
        });
    });

    describe('get', () => {
        it('should return configuration value', () => {
            expect(configManager.get('dimensions')).toBe(4);
        });

        it('should return undefined for non-existent key', () => {
            expect(configManager.get('nonexistent')).toBeUndefined();
        });
    });

    describe('getAll', () => {
        it('should return copy of all configuration', () => {
            const config = configManager.getAll();

            expect(config).toEqual({ dimensions: 4, gridSize: 4 });
        });

        it('should return a copy, not reference', () => {
            const config = configManager.getAll();
            config.dimensions = 999;

            expect(configManager.get('dimensions')).toBe(4); // Unchanged
        });
    });

    describe('set', () => {
        it('should set configuration value', () => {
            configManager.set('dimensions', 5);

            expect(configManager.get('dimensions')).toBe(5);
        });

        it('should return this for chaining', () => {
            const result = configManager.set('dimensions', 5);

            expect(result).toBe(configManager);
        });

        it('should validate value if validator exists', () => {
            const manager = new ConfigManager(
                { dimensions: 4 },
                { dimensions: gameConfigValidators.DIMENSIONS }
            );

            expect(() => manager.set('dimensions', 10)).toThrow('between 2 and 8');
            expect(() => manager.set('dimensions', 1)).toThrow('between 2 and 8');
            expect(() => manager.set('dimensions', 'not a number')).toThrow('must be a number');
        });

        it('should allow valid values', () => {
            const manager = new ConfigManager(
                { dimensions: 4 },
                { dimensions: gameConfigValidators.DIMENSIONS }
            );

            expect(() => manager.set('dimensions', 5)).not.toThrow();
            expect(manager.get('dimensions')).toBe(5);
        });

        it('should skip if value has not changed', () => {
            const listener = vi.fn();
            configManager.onChange(listener);

            configManager.set('dimensions', 4); // Same value

            expect(listener).not.toHaveBeenCalled();
            expect(configManager.getHistory()).toHaveLength(0);
        });

        it('should throw if configuration is locked', () => {
            configManager.lock();

            expect(() => configManager.set('dimensions', 5)).toThrow('locked');
        });
    });

    describe('setAll', () => {
        it('should set multiple values', () => {
            configManager.setAll({
                dimensions: 6,
                gridSize: 5,
                newKey: 'value'
            });

            expect(configManager.get('dimensions')).toBe(6);
            expect(configManager.get('gridSize')).toBe(5);
            expect(configManager.get('newKey')).toBe('value');
        });

        it('should return this for chaining', () => {
            const result = configManager.setAll({ dimensions: 5 });

            expect(result).toBe(configManager);
        });
    });

    describe('onChange', () => {
        it('should notify listener on change', () => {
            const listener = vi.fn();
            configManager.onChange(listener);

            configManager.set('dimensions', 5);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith({
                key: 'dimensions',
                oldValue: 4,
                newValue: 5
            });
        });

        it('should support multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            configManager.onChange(listener1);
            configManager.onChange(listener2);

            configManager.set('dimensions', 5);

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
        });

        it('should return unsubscribe function', () => {
            const listener = vi.fn();
            const unsubscribe = configManager.onChange(listener);

            configManager.set('dimensions', 5);
            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();

            configManager.set('dimensions', 6);
            expect(listener).toHaveBeenCalledTimes(1); // Not called again
        });
    });

    describe('lock/unlock', () => {
        it('should prevent changes when locked', () => {
            configManager.lock();

            expect(() => configManager.set('dimensions', 5)).toThrow('locked');
        });

        it('should allow changes when unlocked', () => {
            configManager.lock();
            configManager.unlock();

            expect(() => configManager.set('dimensions', 5)).not.toThrow();
        });

        it('should report locked status', () => {
            expect(configManager.isLocked()).toBe(false);

            configManager.lock();
            expect(configManager.isLocked()).toBe(true);

            configManager.unlock();
            expect(configManager.isLocked()).toBe(false);
        });
    });

    describe('history', () => {
        it('should track changes in history', () => {
            configManager.set('dimensions', 5);
            configManager.set('gridSize', 3);
            configManager.set('dimensions', 6);

            const history = configManager.getHistory();

            expect(history).toHaveLength(3);
            expect(history[0]).toMatchObject({
                key: 'dimensions',
                oldValue: 4,
                newValue: 5
            });
            expect(history[1]).toMatchObject({
                key: 'gridSize',
                oldValue: 4,
                newValue: 3
            });
            expect(history[2]).toMatchObject({
                key: 'dimensions',
                oldValue: 5,
                newValue: 6
            });

            // Check timestamps
            expect(history[0].timestamp).toBeDefined();
            expect(typeof history[0].timestamp).toBe('number');
        });

        it('should clear history', () => {
            configManager.set('dimensions', 5);
            configManager.set('gridSize', 3);

            expect(configManager.getHistory()).toHaveLength(2);

            configManager.clearHistory();

            expect(configManager.getHistory()).toHaveLength(0);
        });
    });

    describe('reset', () => {
        it('should reset to new configuration', () => {
            configManager.set('dimensions', 6);
            configManager.set('gridSize', 5);

            configManager.reset({ dimensions: 4, gridSize: 4 });

            expect(configManager.get('dimensions')).toBe(4);
            expect(configManager.get('gridSize')).toBe(4);
        });

        it('should emit change event on reset', () => {
            const listener = vi.fn();
            configManager.onChange(listener);

            configManager.reset({ dimensions: 3 });

            expect(listener).toHaveBeenCalledWith({
                key: '*',
                oldValue: { dimensions: 4, gridSize: 4 },
                newValue: { dimensions: 3 }
            });
        });

        it('should throw if locked', () => {
            configManager.lock();

            expect(() => configManager.reset({})).toThrow('locked');
        });
    });

    describe('has', () => {
        it('should check if key exists', () => {
            expect(configManager.has('dimensions')).toBe(true);
            expect(configManager.has('gridSize')).toBe(true);
            expect(configManager.has('nonexistent')).toBe(false);
        });
    });

    describe('gameConfigValidators', () => {
        describe('DIMENSIONS', () => {
            it('should validate dimensions', () => {
                const validate = gameConfigValidators.DIMENSIONS;

                expect(validate(4)).toBeNull(); // Valid
                expect(validate(2)).toBeNull(); // Min
                expect(validate(8)).toBeNull(); // Max

                expect(validate(1)).toContain('between');
                expect(validate(9)).toContain('between');
                expect(validate('4')).toContain('number');
                expect(validate(4.5)).toContain('integer');
            });
        });

        describe('GRID_SIZE', () => {
            it('should validate grid size', () => {
                const validate = gameConfigValidators.GRID_SIZE;

                expect(validate(4)).toBeNull();
                expect(validate(2)).toBeNull();
                expect(validate(6)).toBeNull();

                expect(validate(1)).toContain('between');
                expect(validate(7)).toContain('between');
                expect(validate('4')).toContain('number');
                expect(validate(3.5)).toContain('integer');
            });
        });

        describe('ROTATION_SPEED', () => {
            it('should validate rotation speed', () => {
                const validate = gameConfigValidators.ROTATION_SPEED;

                expect(validate(0.05)).toBeNull();
                expect(validate(0)).toBeNull();
                expect(validate(0.1)).toBeNull();

                expect(validate(-0.1)).toContain('between');
                expect(validate(0.2)).toContain('between');
                expect(validate('0.05')).toContain('number');
            });
        });

        describe('CAMERA_DISTANCE', () => {
            it('should validate camera distance', () => {
                const validate = gameConfigValidators.CAMERA_DISTANCE;

                expect(validate(12)).toBeNull();
                expect(validate(5)).toBeNull();
                expect(validate(50)).toBeNull();

                expect(validate(4)).toContain('between');
                expect(validate(51)).toContain('between');
                expect(validate('12')).toContain('number');
            });
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete configuration lifecycle', () => {
            const manager = new ConfigManager(
                { dimensions: 4, gridSize: 4 },
                {
                    dimensions: gameConfigValidators.DIMENSIONS,
                    gridSize: gameConfigValidators.GRID_SIZE
                }
            );

            const changes = [];
            manager.onChange((change) => changes.push(change));

            // Update settings
            manager.set('dimensions', 5);
            manager.set('gridSize', 3);

            expect(changes).toHaveLength(2);

            // Try invalid value
            expect(() => manager.set('dimensions', 10)).toThrow();

            // Lock and try to change
            manager.lock();
            expect(() => manager.set('dimensions', 6)).toThrow();

            // Unlock and change
            manager.unlock();
            manager.set('dimensions', 6);

            expect(changes).toHaveLength(3);
            expect(manager.get('dimensions')).toBe(6);
        });
    });
});
