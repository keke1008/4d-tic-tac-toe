/**
 * Input handling coordinator
 * Delegates to specialized controllers and coordinates events
 */

import { GestureHandler } from './input/GestureHandler.js';
import { MouseController } from './input/MouseController.js';
import { UIController } from './input/UIController.js';

export class InputController extends EventTarget {
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Setup UI controller first as it manages rotation axes
        this.setupUIController();
        this.setupGestureHandler();
        this.setupMouseController();
    }

    /**
     * Setup gesture handler and listen to its events
     */
    setupGestureHandler() {
        this.gestureHandler = new GestureHandler(this.canvas);

        // Forward cell click events
        this.gestureHandler.addEventListener('cellClick', (e) => {
            this.dispatchEvent(new CustomEvent('cellClick', {
                detail: e.detail
            }));
        });

        // Forward rotation events with axis information from UIController
        this.gestureHandler.addEventListener('rotateHorizontal', (e) => {
            const axes = this.uiController.getRotationAxes();
            this.dispatchEvent(new CustomEvent('rotate', {
                detail: {
                    axis: axes.horizontal,
                    delta: e.detail.delta
                }
            }));
        });

        this.gestureHandler.addEventListener('rotateVertical', (e) => {
            const axes = this.uiController.getRotationAxes();
            this.dispatchEvent(new CustomEvent('rotate', {
                detail: {
                    axis: axes.vertical,
                    delta: e.detail.delta
                }
            }));
        });

        // Forward camera events
        this.gestureHandler.addEventListener('cameraPan', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPan', {
                detail: e.detail
            }));
        });

        this.gestureHandler.addEventListener('cameraPinch', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: e.detail
            }));
        });
    }


    /**
     * Setup mouse controller and listen to its events
     */
    setupMouseController() {
        this.mouseController = new MouseController(this.canvas);

        // Forward camera events
        this.mouseController.addEventListener('cameraPan', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPan', {
                detail: e.detail
            }));
        });

        this.mouseController.addEventListener('cameraPinch', (e) => {
            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: e.detail
            }));
        });
    }

    /**
     * Setup UI controller and listen to its events
     */
    setupUIController() {
        this.uiController = new UIController();

        // Forward reset and auto-rotate events
        this.uiController.addEventListener('reset', () => {
            this.dispatchEvent(new CustomEvent('reset'));
        });

        this.uiController.addEventListener('toggleAutoRotate', () => {
            this.dispatchEvent(new CustomEvent('toggleAutoRotate'));
        });

        // Axis changes are handled internally by UIController
        // Gesture handler will query current axes when needed
    }

    /**
     * Update auto-rotate button icon
     * @param {boolean} autoRotate
     */
    updateAutoRotateButton(autoRotate) {
        this.uiController.updateAutoRotateButton(autoRotate);
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
