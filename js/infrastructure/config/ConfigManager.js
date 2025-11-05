/**
 * Managed configuration with validation and change tracking
 * Prevents direct mutation and validates all changes
 *
 * @example
 * const config = new ConfigManager(
 *     { dimensions: 4, gridSize: 4 },
 *     { dimensions: (val) => val >= 2 && val <= 8 ? null : 'Invalid' }
 * );
 * config.onChange((change) => console.log('Changed:', change));
 * config.set('dimensions', 5); // Validated and tracked
 */
import { EventBus } from '../events/EventBus.js';

export class ConfigManager {
    /**
     * Create a new config manager
     * @param {Object} initialConfig - Initial configuration
     * @param {Object} validators - Validator functions { key: (value) => errorMessage|null }
     */
    constructor(initialConfig = {}, validators = {}) {
        this._config = { ...initialConfig };
        this._validators = validators;
        this._eventBus = new EventBus();
        this._locked = false;
        this._history = [];
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @returns {*} Configuration value
     */
    get(key) {
        return this._config[key];
    }

    /**
     * Get all configuration
     * @returns {Object} Copy of all configuration
     */
    getAll() {
        return { ...this._config };
    }

    /**
     * Set a configuration value (with validation)
     * @param {string} key - Configuration key
     * @param {*} value - New value
     * @throws {Error} If validation fails or config is locked
     * @returns {ConfigManager} this (for chaining)
     */
    set(key, value) {
        if (this._locked) {
            throw new Error('Configuration is locked and cannot be modified');
        }

        // Validate
        if (this._validators[key]) {
            const error = this._validators[key](value);
            if (error) {
                throw new Error(`Invalid configuration value for "${key}": ${error}`);
            }
        }

        const oldValue = this._config[key];

        // Skip if value hasn't changed
        if (oldValue === value) {
            return this;
        }

        this._config[key] = value;

        // Track change in history
        this._history.push({
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now()
        });

        // Emit change event
        this._eventBus.emit('configChanged', {
            key,
            oldValue,
            newValue: value
        });

        return this; // For chaining
    }

    /**
     * Set multiple configuration values
     * @param {Object} newConfig - Object with key-value pairs to set
     * @returns {ConfigManager} this (for chaining)
     */
    setAll(newConfig) {
        for (const [key, value] of Object.entries(newConfig)) {
            this.set(key, value);
        }
        return this;
    }

    /**
     * Subscribe to configuration changes
     * @param {Function} handler - Callback (change) => void
     * @returns {Function} Unsubscribe function
     */
    onChange(handler) {
        return this._eventBus.on('configChanged', handler);
    }

    /**
     * Lock configuration (prevent further changes)
     */
    lock() {
        this._locked = true;
    }

    /**
     * Unlock configuration (allow changes)
     */
    unlock() {
        this._locked = false;
    }

    /**
     * Check if configuration is locked
     * @returns {boolean}
     */
    isLocked() {
        return this._locked;
    }

    /**
     * Get change history
     * @returns {Array} Array of change objects
     */
    getHistory() {
        return [...this._history];
    }

    /**
     * Clear change history
     */
    clearHistory() {
        this._history = [];
    }

    /**
     * Reset to initial configuration
     * @param {Object} initialConfig - Configuration to reset to
     */
    reset(initialConfig = {}) {
        if (this._locked) {
            throw new Error('Configuration is locked and cannot be reset');
        }

        const oldConfig = { ...this._config };
        this._config = { ...initialConfig };

        // Emit change event for reset
        this._eventBus.emit('configChanged', {
            key: '*',
            oldValue: oldConfig,
            newValue: this._config
        });
    }

    /**
     * Check if a key exists in configuration
     * @param {string} key - Key to check
     * @returns {boolean}
     */
    has(key) {
        return key in this._config;
    }
}

/**
 * Validator functions for game configuration
 */
export const gameConfigValidators = {
    DIMENSIONS: (value) => {
        if (typeof value !== 'number') {
            return 'Dimensions must be a number';
        }
        if (!Number.isInteger(value)) {
            return 'Dimensions must be an integer';
        }
        if (value < 2 || value > 8) {
            return 'Dimensions must be between 2 and 8';
        }
        return null;
    },

    GRID_SIZE: (value) => {
        if (typeof value !== 'number') {
            return 'Grid size must be a number';
        }
        if (!Number.isInteger(value)) {
            return 'Grid size must be an integer';
        }
        if (value < 2 || value > 6) {
            return 'Grid size must be between 2 and 6';
        }
        return null;
    },

    ROTATION_SPEED: (value) => {
        if (typeof value !== 'number') {
            return 'Rotation speed must be a number';
        }
        if (value < 0 || value > 0.1) {
            return 'Rotation speed must be between 0 and 0.1';
        }
        return null;
    },

    CAMERA_DISTANCE: (value) => {
        if (typeof value !== 'number') {
            return 'Camera distance must be a number';
        }
        if (value < 5 || value > 50) {
            return 'Camera distance must be between 5 and 50';
        }
        return null;
    },
};
