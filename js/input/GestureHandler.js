/**
 * Handles gesture recognition using Hammer.js
 * Emits normalized gesture events for game input
 */

import { CONFIG } from '../config.js';

export class GestureHandler extends EventTarget {
    /**
     * Create a gesture handler
     * @param {HTMLCanvasElement} canvas - Canvas element to attach gestures to
     */
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Gesture state
        this.lastPinchScale = 1;
        this.lastPanDelta = { x: 0, y: 0 };

        this.setupHammer();
    }

    /**
     * Setup Hammer.js for gesture recognition
     */
    setupHammer() {
        // Create Hammer instance
        this.hammer = new Hammer.Manager(this.canvas);

        // Single-tap recognizer
        const tap = new Hammer.Tap({
            event: 'tap',
            pointers: 1,
            threshold: 10,
            time: 300
        });

        // Single-finger pan recognizer (for rotation)
        const singlePan = new Hammer.Pan({
            event: 'singlepan',
            pointers: 1,
            threshold: 5,
            direction: Hammer.DIRECTION_ALL
        });

        // Two-finger pan recognizer (for camera movement)
        const doublePan = new Hammer.Pan({
            event: 'doublepan',
            pointers: 2,
            threshold: 5,
            direction: Hammer.DIRECTION_ALL
        });

        // Pinch recognizer (for zoom)
        const pinch = new Hammer.Pinch({
            event: 'pinch',
            pointers: 2,
            threshold: 0.1
        });

        // Add recognizers to manager
        this.hammer.add([tap, singlePan, doublePan, pinch]);

        // Allow pinch and pan to be recognized simultaneously
        pinch.recognizeWith([doublePan]);

        // Setup gesture event listeners
        this.setupGestureListeners();
    }

    /**
     * Setup Hammer.js gesture event listeners
     */
    setupGestureListeners() {
        // Tap gesture - for placing markers
        this.hammer.on('tap', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = ((e.center.x - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.center.y - rect.top) / rect.height) * 2 + 1;

            this.dispatchEvent(new CustomEvent('cellClick', {
                detail: { mouseX, mouseY }
            }));
        });

        // Single-finger pan - for 4D rotation (supports diagonal drag)
        this.hammer.on('singlepanstart', (e) => {
            // Don't start rotation if Shift key is pressed (used for camera pan)
            if (e.srcEvent && e.srcEvent.shiftKey) {
                return;
            }
        });

        this.hammer.on('singlepan', (e) => {
            // Ignore rotation if Shift key is pressed (used for camera pan)
            if (e.srcEvent && e.srcEvent.shiftKey) {
                return;
            }

            const absDeltaX = Math.abs(e.deltaX);
            const absDeltaY = Math.abs(e.deltaY);

            // Emit rotation events for both axes independently (supports diagonal drag)
            if (absDeltaX > CONFIG.SWIPE_THRESHOLD) {
                this.dispatchEvent(new CustomEvent('rotateHorizontal', {
                    detail: { delta: e.velocityX * CONFIG.ROTATION_SENSITIVITY * 10 }
                }));
            }

            if (absDeltaY > CONFIG.SWIPE_THRESHOLD) {
                this.dispatchEvent(new CustomEvent('rotateVertical', {
                    detail: { delta: -e.velocityY * CONFIG.ROTATION_SENSITIVITY * 10 }
                }));
            }
        });

        this.hammer.on('singlepanend', () => {
            // No state to clear for diagonal drag
        });

        // Two-finger pan - for camera movement
        this.hammer.on('doublepanstart', () => {
            this.lastPanDelta = { x: 0, y: 0 };
        });

        this.hammer.on('doublepan', (e) => {
            // Calculate incremental delta from last position
            const currentDelta = { x: e.deltaX, y: e.deltaY };
            const incrementalDeltaX = currentDelta.x - this.lastPanDelta.x;
            const incrementalDeltaY = currentDelta.y - this.lastPanDelta.y;
            this.lastPanDelta = currentDelta;

            this.dispatchEvent(new CustomEvent('cameraPan', {
                detail: {
                    deltaX: -incrementalDeltaX * 0.01,
                    deltaY: incrementalDeltaY * 0.01
                }
            }));
        });

        this.hammer.on('doublepanend', () => {
            this.lastPanDelta = { x: 0, y: 0 };
        });

        // Pinch - for camera zoom
        this.hammer.on('pinchstart', (e) => {
            // Use current scale as baseline (e.scale at start)
            this.lastPinchScale = e.scale;
        });

        this.hammer.on('pinch', (e) => {
            // Calculate delta from last recorded scale
            const scaleDelta = e.scale - this.lastPinchScale;
            this.lastPinchScale = e.scale;

            // Apply zoom with appropriate sensitivity
            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: { delta: scaleDelta * 5 }  // Increased multiplier for better responsiveness
            }));
        });

        this.hammer.on('pinchend', () => {
            // Reset to default
            this.lastPinchScale = 1;
        });
    }

    /**
     * Cleanup Hammer.js instance
     */
    destroy() {
        if (this.hammer) {
            this.hammer.destroy();
        }
    }
}
