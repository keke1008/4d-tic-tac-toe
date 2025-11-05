/**
 * EventBus unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, EventTypes } from '../../../js/infrastructure/events/EventBus.js';

describe('EventBus', () => {
    let eventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    describe('constructor', () => {
        it('should create an empty event bus', () => {
            expect(eventBus.eventTypes()).toEqual([]);
        });
    });

    describe('on', () => {
        it('should register event handler', () => {
            const handler = vi.fn();
            eventBus.on('test', handler);

            expect(eventBus.hasListeners('test')).toBe(true);
            expect(eventBus.listenerCount('test')).toBe(1);
        });

        it('should support multiple handlers for same event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const handler3 = vi.fn();

            eventBus.on('test', handler1);
            eventBus.on('test', handler2);
            eventBus.on('test', handler3);

            expect(eventBus.listenerCount('test')).toBe(3);
        });

        it('should return unsubscribe function', () => {
            const handler = vi.fn();
            const unsubscribe = eventBus.on('test', handler);

            expect(typeof unsubscribe).toBe('function');
            expect(eventBus.hasListeners('test')).toBe(true);

            unsubscribe();
            expect(eventBus.hasListeners('test')).toBe(false);
        });

        it('should throw error for invalid event type', () => {
            expect(() => eventBus.on('', () => {})).toThrow('non-empty string');
            expect(() => eventBus.on(null, () => {})).toThrow('non-empty string');
            expect(() => eventBus.on(123, () => {})).toThrow('non-empty string');
        });

        it('should throw error for invalid handler', () => {
            expect(() => eventBus.on('test', null)).toThrow('function');
            expect(() => eventBus.on('test', 'not a function')).toThrow('function');
            expect(() => eventBus.on('test', {})).toThrow('function');
        });
    });

    describe('off', () => {
        it('should unregister event handler', () => {
            const handler = vi.fn();
            eventBus.on('test', handler);
            expect(eventBus.hasListeners('test')).toBe(true);

            eventBus.off('test', handler);
            expect(eventBus.hasListeners('test')).toBe(false);
        });

        it('should only remove specified handler', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            eventBus.on('test', handler1);
            eventBus.on('test', handler2);
            expect(eventBus.listenerCount('test')).toBe(2);

            eventBus.off('test', handler1);
            expect(eventBus.listenerCount('test')).toBe(1);

            eventBus.off('test', handler2);
            expect(eventBus.hasListeners('test')).toBe(false);
        });

        it('should handle removing non-existent handler', () => {
            const handler = vi.fn();

            expect(() => eventBus.off('test', handler)).not.toThrow();
            expect(() => eventBus.off('nonexistent', handler)).not.toThrow();
        });
    });

    describe('emit', () => {
        it('should call registered handler', () => {
            const handler = vi.fn();
            eventBus.on('test', handler);

            eventBus.emit('test', { data: 'value' });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ data: 'value' });
        });

        it('should call multiple handlers in order', () => {
            const calls = [];
            const handler1 = vi.fn(() => calls.push(1));
            const handler2 = vi.fn(() => calls.push(2));
            const handler3 = vi.fn(() => calls.push(3));

            eventBus.on('test', handler1);
            eventBus.on('test', handler2);
            eventBus.on('test', handler3);

            eventBus.emit('test');

            expect(calls).toEqual([1, 2, 3]);
        });

        it('should not throw if no handlers registered', () => {
            expect(() => eventBus.emit('nonexistent')).not.toThrow();
        });

        it('should pass data to handlers', () => {
            const handler = vi.fn();
            eventBus.on('test', handler);

            const data = { id: 123, name: 'test', nested: { value: true } };
            eventBus.emit('test', data);

            expect(handler).toHaveBeenCalledWith(data);
        });

        it('should not break if handler throws error', () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const goodHandler = vi.fn();

            eventBus.on('test', errorHandler);
            eventBus.on('test', goodHandler);

            expect(() => eventBus.emit('test')).not.toThrow();

            expect(errorHandler).toHaveBeenCalledTimes(1);
            expect(goodHandler).toHaveBeenCalledTimes(1);
        });

        it('should handle handler that unsubscribes itself', () => {
            let unsubscribe;
            const handler = vi.fn(() => {
                unsubscribe();
            });

            unsubscribe = eventBus.on('test', handler);

            eventBus.emit('test');
            expect(handler).toHaveBeenCalledTimes(1);

            eventBus.emit('test');
            expect(handler).toHaveBeenCalledTimes(1); // Not called again
        });

        it('should throw error for invalid event type', () => {
            expect(() => eventBus.emit('')).toThrow('non-empty string');
            expect(() => eventBus.emit(null)).toThrow('non-empty string');
        });
    });

    describe('once', () => {
        it('should call handler only once', () => {
            const handler = vi.fn();
            eventBus.once('test', handler);

            eventBus.emit('test', 1);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(1);

            eventBus.emit('test', 2);
            expect(handler).toHaveBeenCalledTimes(1); // Still 1
        });

        it('should auto-unsubscribe after firing', () => {
            const handler = vi.fn();
            eventBus.once('test', handler);

            expect(eventBus.hasListeners('test')).toBe(true);

            eventBus.emit('test');

            expect(eventBus.hasListeners('test')).toBe(false);
        });

        it('should return unsubscribe function', () => {
            const handler = vi.fn();
            const unsubscribe = eventBus.once('test', handler);

            expect(typeof unsubscribe).toBe('function');

            unsubscribe();
            eventBus.emit('test');

            expect(handler).not.toHaveBeenCalled();
        });

        it('should throw error for invalid handler', () => {
            expect(() => eventBus.once('test', null)).toThrow('function');
        });
    });

    describe('clear', () => {
        it('should clear all listeners for specific event', () => {
            eventBus.on('test1', () => {});
            eventBus.on('test1', () => {});
            eventBus.on('test2', () => {});

            expect(eventBus.listenerCount('test1')).toBe(2);
            expect(eventBus.listenerCount('test2')).toBe(1);

            eventBus.clear('test1');

            expect(eventBus.hasListeners('test1')).toBe(false);
            expect(eventBus.hasListeners('test2')).toBe(true);
        });

        it('should clear all listeners if no event specified', () => {
            eventBus.on('test1', () => {});
            eventBus.on('test2', () => {});
            eventBus.on('test3', () => {});

            expect(eventBus.eventTypes()).toHaveLength(3);

            eventBus.clear();

            expect(eventBus.eventTypes()).toHaveLength(0);
        });
    });

    describe('listenerCount', () => {
        it('should return correct count', () => {
            expect(eventBus.listenerCount('test')).toBe(0);

            eventBus.on('test', () => {});
            expect(eventBus.listenerCount('test')).toBe(1);

            eventBus.on('test', () => {});
            expect(eventBus.listenerCount('test')).toBe(2);

            eventBus.on('test', () => {});
            expect(eventBus.listenerCount('test')).toBe(3);
        });
    });

    describe('eventTypes', () => {
        it('should return all registered event types', () => {
            expect(eventBus.eventTypes()).toEqual([]);

            eventBus.on('event1', () => {});
            eventBus.on('event2', () => {});
            eventBus.on('event3', () => {});

            const types = eventBus.eventTypes();
            expect(types).toContain('event1');
            expect(types).toContain('event2');
            expect(types).toContain('event3');
            expect(types).toHaveLength(3);
        });
    });

    describe('hasListeners', () => {
        it('should return true if event has listeners', () => {
            expect(eventBus.hasListeners('test')).toBe(false);

            eventBus.on('test', () => {});
            expect(eventBus.hasListeners('test')).toBe(true);

            eventBus.clear('test');
            expect(eventBus.hasListeners('test')).toBe(false);
        });
    });

    describe('EventTypes constants', () => {
        it('should have predefined event types', () => {
            expect(EventTypes.GAME_STARTED).toBe('game:started');
            expect(EventTypes.MARKER_PLACED).toBe('game:markerPlaced');
            expect(EventTypes.ROTATION_UPDATED).toBe('visual:rotationUpdated');
            expect(EventTypes.SETTINGS_CHANGED).toBe('settings:changed');
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex event flow', () => {
            const log = [];

            // Game flow
            eventBus.on(EventTypes.GAME_STARTED, () => log.push('started'));
            eventBus.on(EventTypes.MARKER_PLACED, (data) => log.push(`placed:${data.player}`));
            eventBus.on(EventTypes.GAME_WON, (data) => log.push(`won:${data.winner}`));

            eventBus.emit(EventTypes.GAME_STARTED);
            eventBus.emit(EventTypes.MARKER_PLACED, { player: 'X' });
            eventBus.emit(EventTypes.MARKER_PLACED, { player: 'O' });
            eventBus.emit(EventTypes.GAME_WON, { winner: 'X' });

            expect(log).toEqual(['started', 'placed:X', 'placed:O', 'won:X']);
        });

        it('should support async handlers', async () => {
            const results = [];

            eventBus.on('async', async (data) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                results.push(data);
            });

            eventBus.emit('async', 1);
            eventBus.emit('async', 2);
            eventBus.emit('async', 3);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(results).toEqual([1, 2, 3]);
        });
    });
});
