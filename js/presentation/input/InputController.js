/**
 * Input Controller for Presentation Layer (Phase 4)
 * Coordinates input handling and delegates to specialized controllers
 * Integrates with EventBus and StateStore
 */

import { GestureHandler } from './GestureHandler.js';
import { MouseController } from './MouseController.js';
import { UIController } from './UIController.js';

/**
 * InputController - coordinates input handling
 */
export class InputController extends EventTarget {
    /**
     * Create input controller
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {EventBus} eventBus - Event bus instance (optional)
     * @param {StateStore} stateStore - State store instance (optional)
     */
    constructor(canvas, eventBus = null, stateStore = null) {
        super();
        this.canvas = canvas;
        this.eventBus = eventBus;
        this.store = stateStore;

        // Setup UI controller first as it manages rotation axes
        this.setupUIController();
        this.setupGestureHandler();
        this.setupMouseController();

        // Subscribe to state changes if store provided
        if (this.store) {
            this.store.subscribe((state) => this.onStateChange(state));
        }
    }

    /**
     * Handle state changes (new architecture)
     * @param {Object} state - Current state
     * @private
     */
    onStateChange(state) {
        // Update auto-rotate button based on state
        if (state.visual && state.visual.autoRotate !== this._lastAutoRotate) {
            this._lastAutoRotate = state.visual.autoRotate;
            this.updateAutoRotateButton(state.visual.autoRotate);
        }
    }

    /**
     * Setup gesture handler and listen to its events
     * @private
     */
    setupGestureHandler() {
        this.gestureHandler = new GestureHandler(this.canvas, this.eventBus, this.store);

        // Forward cell click events (legacy API)
        this.gestureHandler.addEventListener('cellClick', (e) => {
            this.dispatchEvent(new CustomEvent('cellClick', {
                detail: e.detail
            }));
        });

        // Forward rotation events with axis information from UIController
        this.gestureHandler.addEventListener('rotateHorizontal', (e) => {
            const axes = this.uiController.getRotationAxes();
            const detail = {
                axis: axes.horizontal,
                delta: e.detail.delta
            };

            // Dispatch to legacy event system
            this.dispatchEvent(new CustomEvent('rotate', { detail }));

            // Also emit to EventBus if available
            if (this.eventBus) {
                this.eventBus.emit('input:rotate', detail);
            }
        });

        this.gestureHandler.addEventListener('rotateVertical', (e) => {
            const axes = this.uiController.getRotationAxes();
            const detail = {
                axis: axes.vertical,
                delta: e.detail.delta
            };

            // Dispatch to legacy event system
            this.dispatchEvent(new CustomEvent('rotate', { detail }));

            // Also emit to EventBus if available
            if (this.eventBus) {
                this.eventBus.emit('input:rotate', detail);
            }
        });

        // Forward camera events
        this.gestureHandler.addEventListener('cameraPan', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPan', {
                detail: e.detail
            }));

            if (this.eventBus) {
                this.eventBus.emit('input:cameraPan', e.detail);
            }
        });

        this.gestureHandler.addEventListener('cameraPinch', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: e.detail
            }));

            if (this.eventBus) {
                this.eventBus.emit('input:cameraPinch', e.detail);
            }
        });
    }

    /**
     * Setup mouse controller and listen to its events
     * @private
     */
    setupMouseController() {
        this.mouseController = new MouseController(this.canvas, this.eventBus, this.store);

        // Forward camera events
        this.mouseController.addEventListener('cameraPan', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPan', {
                detail: e.detail
            }));

            if (this.eventBus) {
                this.eventBus.emit('input:cameraPan', e.detail);
            }
        });

        this.mouseController.addEventListener('cameraPinch', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: e.detail
            }));

            if (this.eventBus) {
                this.eventBus.emit('input:cameraPinch', e.detail);
            }
        });
    }

    /**
     * Setup UI controller and listen to its events
     * @private
     */
    setupUIController() {
        this.uiController = new UIController(this.eventBus, this.store);

        // Forward reset and auto-rotate events
        this.uiController.addEventListener('reset', () => {
            this.dispatchEvent(new CustomEvent('reset'));

            if (this.eventBus) {
                this.eventBus.emit('input:reset', {});
            }
        });

        this.uiController.addEventListener('toggleAutoRotate', () => {
            this.dispatchEvent(new CustomEvent('toggleAutoRotate'));

            if (this.eventBus) {
                this.eventBus.emit('input:toggleAutoRotate', {});
            }
        });

        // Axis changes are handled internally by UIController
        // Gesture handler will query current axes when needed
    }

    /**
     * Update auto-rotate button icon
     * @param {boolean} autoRotate - Auto-rotate enabled
     */
    updateAutoRotateButton(autoRotate) {
        this.uiController.updateAutoRotateButton(autoRotate);
    }

    /**
     * Get rotation axes from UI controller
     * @returns {Object} Rotation axes {horizontal, vertical}
     */
    getRotationAxes() {
        return this.uiController.getRotationAxes();
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.gestureHandler) {
            this.gestureHandler.destroy();
        }
        if (this.mouseController) {
            this.mouseController.destroy();
        }
        if (this.uiController) {
            this.uiController.destroy();
        }
    }
}
