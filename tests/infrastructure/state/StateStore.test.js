/**
 * StateStore unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateStore } from '../../../js/infrastructure/state/StateStore.js';

describe('StateStore', () => {
    describe('constructor', () => {
        it('should initialize with initial state', () => {
            const initialState = { count: 0 };
            const reducer = (state) => state;
            const store = new StateStore(initialState, reducer);

            expect(store.getState()).toEqual({ count: 0 });
        });

        it('should accept middleware array', () => {
            const middleware = [(store) => (action) => action];
            const store = new StateStore({ count: 0 }, (s) => s, middleware);

            expect(store).toBeDefined();
        });
    });

    describe('getState', () => {
        it('should return current state', () => {
            const initialState = { count: 5, name: 'test' };
            const store = new StateStore(initialState, (s) => s);

            expect(store.getState()).toEqual(initialState);
        });
    });

    describe('dispatch', () => {
        it('should update state via reducer', () => {
            const reducer = (state, action) => {
                if (action.type === 'INCREMENT') {
                    return { count: state.count + 1 };
                }
                return state;
            };
            const store = new StateStore({ count: 0 }, reducer);

            store.dispatch({ type: 'INCREMENT' });

            expect(store.getState().count).toBe(1);
        });

        it('should handle multiple dispatches', () => {
            const reducer = (state, action) => {
                switch (action.type) {
                    case 'INCREMENT':
                        return { count: state.count + 1 };
                    case 'DECREMENT':
                        return { count: state.count - 1 };
                    case 'ADD':
                        return { count: state.count + action.payload };
                    default:
                        return state;
                }
            };
            const store = new StateStore({ count: 0 }, reducer);

            store.dispatch({ type: 'INCREMENT' });
            store.dispatch({ type: 'INCREMENT' });
            store.dispatch({ type: 'ADD', payload: 5 });
            store.dispatch({ type: 'DECREMENT' });

            expect(store.getState().count).toBe(6);
        });

        it('should throw error if action has no type', () => {
            const store = new StateStore({ count: 0 }, (s) => s);

            expect(() => store.dispatch({})).toThrow('type');
            expect(() => store.dispatch({ payload: 1 })).toThrow('type');
            expect(() => store.dispatch(null)).toThrow();
        });

        it('should throw error if dispatch during reduction', () => {
            const reducer = (state, action) => {
                if (action.type === 'TRIGGER_NESTED') {
                    store.dispatch({ type: 'NESTED' }); // ❌ Should throw
                }
                return state;
            };
            const store = new StateStore({ count: 0 }, reducer);

            expect(() => store.dispatch({ type: 'TRIGGER_NESTED' }))
                .toThrow('Cannot dispatch while reducing');
        });
    });

    describe('subscribe', () => {
        it('should notify listener on state change', () => {
            const reducer = (state, action) => {
                if (action.type === 'INCREMENT') {
                    return { count: state.count + 1 };
                }
                return state;
            };
            const store = new StateStore({ count: 0 }, reducer);

            const listener = vi.fn();
            store.subscribe(listener);

            store.dispatch({ type: 'INCREMENT' });

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(
                { count: 1 },  // newState
                { count: 0 },  // prevState
                { type: 'INCREMENT' }  // action
            );
        });

        it('should support multiple listeners', () => {
            const reducer = (state) => ({ ...state, updated: true });
            const store = new StateStore({ count: 0 }, reducer);

            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const listener3 = vi.fn();

            store.subscribe(listener1);
            store.subscribe(listener2);
            store.subscribe(listener3);

            store.dispatch({ type: 'UPDATE' });

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
            expect(listener3).toHaveBeenCalledTimes(1);
        });

        it('should return unsubscribe function', () => {
            const store = new StateStore({ count: 0 }, (s) => s);
            const listener = vi.fn();

            const unsubscribe = store.subscribe(listener);

            store.dispatch({ type: 'TEST' });
            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();

            store.dispatch({ type: 'TEST' });
            expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
        });

        it('should throw error if listener is not a function', () => {
            const store = new StateStore({ count: 0 }, (s) => s);

            expect(() => store.subscribe(null)).toThrow('function');
            expect(() => store.subscribe('not a function')).toThrow('function');
            expect(() => store.subscribe({})).toThrow('function');
        });

        it('should not break if listener throws error', () => {
            const reducer = (state) => ({ ...state, updated: true });
            const store = new StateStore({ count: 0 }, reducer);

            const errorListener = vi.fn(() => {
                throw new Error('Listener error');
            });
            const goodListener = vi.fn();

            store.subscribe(errorListener);
            store.subscribe(goodListener);

            // Should not throw
            expect(() => store.dispatch({ type: 'UPDATE' })).not.toThrow();

            // Both listeners should have been called
            expect(errorListener).toHaveBeenCalledTimes(1);
            expect(goodListener).toHaveBeenCalledTimes(1);
        });
    });

    describe('middleware', () => {
        it('should apply middleware to actions', () => {
            const middleware = (store) => (action) => {
                // Modify action
                return {
                    ...action,
                    payload: action.payload * 2
                };
            };

            const reducer = (state, action) => {
                if (action.type === 'ADD') {
                    return { count: state.count + action.payload };
                }
                return state;
            };

            const store = new StateStore({ count: 0 }, reducer, [middleware]);

            store.dispatch({ type: 'ADD', payload: 5 });

            expect(store.getState().count).toBe(10); // 5 * 2
        });

        it('should apply multiple middleware in order', () => {
            const calls = [];

            const middleware1 = (store) => (action) => {
                calls.push('mw1');
                return action;
            };

            const middleware2 = (store) => (action) => {
                calls.push('mw2');
                return action;
            };

            const middleware3 = (store) => (action) => {
                calls.push('mw3');
                return action;
            };

            const store = new StateStore(
                { count: 0 },
                (s) => s,
                [middleware1, middleware2, middleware3]
            );

            store.dispatch({ type: 'TEST' });

            expect(calls).toEqual(['mw1', 'mw2', 'mw3']);
        });

        it('should cancel action if middleware returns null', () => {
            const middleware = (store) => (action) => {
                if (action.type === 'BLOCKED') {
                    return null; // Cancel action
                }
                return action;
            };

            const reducer = vi.fn((state) => state);
            const listener = vi.fn();

            const store = new StateStore({ count: 0 }, reducer, [middleware]);
            store.subscribe(listener);

            store.dispatch({ type: 'BLOCKED' });

            // Reducer and listener should not be called
            expect(reducer).not.toHaveBeenCalled();
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        it('should return listener count', () => {
            const store = new StateStore({ count: 0 }, (s) => s);

            expect(store.getListenerCount()).toBe(0);

            store.subscribe(() => {});
            expect(store.getListenerCount()).toBe(1);

            store.subscribe(() => {});
            expect(store.getListenerCount()).toBe(2);
        });

        it('should clear all listeners', () => {
            const store = new StateStore({ count: 0 }, (s) => s);

            store.subscribe(() => {});
            store.subscribe(() => {});
            expect(store.getListenerCount()).toBe(2);

            store.clearListeners();
            expect(store.getListenerCount()).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('should handle state that is an array', () => {
            const reducer = (state, action) => {
                if (action.type === 'PUSH') {
                    return [...state, action.payload];
                }
                return state;
            };

            const store = new StateStore([1, 2, 3], reducer);

            store.dispatch({ type: 'PUSH', payload: 4 });

            expect(store.getState()).toEqual([1, 2, 3, 4]);
        });

        it('should handle state that is a primitive', () => {
            const reducer = (state, action) => {
                if (action.type === 'INCREMENT') {
                    return state + 1;
                }
                return state;
            };

            const store = new StateStore(0, reducer);

            store.dispatch({ type: 'INCREMENT' });
            store.dispatch({ type: 'INCREMENT' });

            expect(store.getState()).toBe(2);
        });

        it('should handle undefined state', () => {
            const reducer = (state = { count: 0 }, action) => {
                if (action.type === 'SET') {
                    return { count: action.payload };
                }
                return state;
            };

            const store = new StateStore(undefined, reducer);

            expect(store.getState()).toBeUndefined();

            store.dispatch({ type: 'SET', payload: 10 });
            expect(store.getState()).toEqual({ count: 10 });
        });
    });
});
