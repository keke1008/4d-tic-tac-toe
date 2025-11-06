/**
 * Redux-inspired centralized state management
 * Single source of truth for the entire application
 *
 * @example
 * const store = new StateStore(initialState, rootReducer);
 * store.subscribe((newState, prevState) => {
 *     console.log('State changed:', newState);
 * });
 * store.dispatch({ type: 'INCREMENT', payload: 1 });
 */
export class StateStore {
    /**
     * Create a new state store
     * @param {Object} initialState - Initial state
     * @param {Function} rootReducer - Root reducer function (state, action) => newState
     * @param {Array<Function>} middleware - Middleware functions
     */
    constructor(initialState, rootReducer, middleware = []) {
        this._state = initialState;
        this._reducer = rootReducer;
        this._middleware = middleware;
        this._listeners = new Set();
        this._isDispatching = false;
    }

    /**
     * Get current state (read-only)
     * @returns {Object} Current state
     */
    getState() {
        return this._state;
    }

    /**
     * Dispatch an action to update state
     * @param {Object} action - Action object with type and optional payload
     * @throws {Error} If dispatch is called during reduction
     */
    dispatch(action) {
        if (this._isDispatching) {
            throw new Error('Cannot dispatch while reducing. Reducers must be pure functions.');
        }

        if (!action || typeof action.type !== 'string') {
            throw new Error('Actions must be plain objects with a string "type" property');
        }

        try {
            this._isDispatching = true;

            // Apply middleware chain
            let finalAction = action;
            for (const middleware of this._middleware) {
                finalAction = middleware(this)(finalAction);
                if (!finalAction) {
                    // Middleware can cancel action by returning null/undefined
                    return;
                }
            }

            // Reduce state
            const prevState = this._state;
            this._state = this._reducer(prevState, finalAction);

            // Notify subscribers
            this._notifyListeners(prevState, this._state, finalAction);

        } finally {
            this._isDispatching = false;
        }
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback (newState, prevState, action) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this._listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this._listeners.delete(listener);
        };
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners(prevState, nextState, action) {
        for (const listener of this._listeners) {
            try {
                listener(nextState, prevState, action);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        }
    }

    /**
     * Get number of active listeners (for debugging)
     * @returns {number}
     */
    getListenerCount() {
        return this._listeners.size;
    }

    /**
     * Clear all listeners (for cleanup/testing)
     */
    clearListeners() {
        this._listeners.clear();
    }
}
