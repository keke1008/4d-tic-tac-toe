/**
 * Centralized event bus for cross-component communication
 * Enables loose coupling between components
 *
 * @example
 * const eventBus = new EventBus();
 * eventBus.on('userLoggedIn', (user) => console.log('User:', user));
 * eventBus.emit('userLoggedIn', { name: 'Alice' });
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Callback function (data) => void
     * @returns {Function} Unsubscribe function
     */
    on(eventType, handler) {
        if (typeof eventType !== 'string' || !eventType) {
            throw new Error('Event type must be a non-empty string');
        }

        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, new Set());
        }

        this._listeners.get(eventType).add(handler);

        // Return unsubscribe function
        return () => this.off(eventType, handler);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventType - Event type
     * @param {Function} handler - Handler to remove
     */
    off(eventType, handler) {
        const handlers = this._listeners.get(eventType);
        if (handlers) {
            handlers.delete(handler);

            // Clean up empty sets
            if (handlers.size === 0) {
                this._listeners.delete(eventType);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventType - Event type to emit
     * @param {*} data - Data to pass to handlers
     */
    emit(eventType, data) {
        if (typeof eventType !== 'string' || !eventType) {
            throw new Error('Event type must be a non-empty string');
        }

        const handlers = this._listeners.get(eventType);
        if (!handlers) return;

        // Create array copy to avoid issues if handler modifies listeners
        const handlersArray = Array.from(handlers);

        for (const handler of handlersArray) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for "${eventType}":`, error);
            }
        }
    }

    /**
     * Subscribe to an event that fires only once
     * @param {string} eventType - Event type
     * @param {Function} handler - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(eventType, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        const wrapper = (data) => {
            handler(data);
            this.off(eventType, wrapper);
        };

        return this.on(eventType, wrapper);
    }

    /**
     * Clear all listeners for an event type, or all listeners if no type specified
     * @param {string} [eventType] - Event type to clear (optional)
     */
    clear(eventType) {
        if (eventType) {
            this._listeners.delete(eventType);
        } else {
            this._listeners.clear();
        }
    }

    /**
     * Get number of listeners for an event type
     * @param {string} eventType - Event type
     * @returns {number} Number of listeners
     */
    listenerCount(eventType) {
        const handlers = this._listeners.get(eventType);
        return handlers ? handlers.size : 0;
    }

    /**
     * Get all event types that have listeners
     * @returns {Array<string>} Array of event types
     */
    eventTypes() {
        return Array.from(this._listeners.keys());
    }

    /**
     * Check if an event type has any listeners
     * @param {string} eventType - Event type
     * @returns {boolean} True if has listeners
     */
    hasListeners(eventType) {
        return this._listeners.has(eventType) && this._listeners.get(eventType).size > 0;
    }
}

/**
 * Pre-defined event types for the application
 */
export const EventTypes = {
    // Game events
    GAME_STARTED: 'game:started',
    GAME_RESET: 'game:reset',
    MARKER_PLACED: 'game:markerPlaced',
    PLAYER_SWITCHED: 'game:playerSwitched',
    GAME_WON: 'game:won',
    GAME_DRAW: 'game:draw',

    // Visual events
    ROTATION_UPDATED: 'visual:rotationUpdated',
    CAMERA_MOVED: 'visual:cameraMoved',
    CELL_HOVERED: 'visual:cellHovered',
    CELL_SELECTED: 'visual:cellSelected',

    // Settings events
    SETTINGS_CHANGED: 'settings:changed',
    DIMENSIONS_CHANGED: 'settings:dimensionsChanged',
    GRID_SIZE_CHANGED: 'settings:gridSizeChanged',

    // UI events
    MODAL_OPENED: 'ui:modalOpened',
    MODAL_CLOSED: 'ui:modalClosed',
};
