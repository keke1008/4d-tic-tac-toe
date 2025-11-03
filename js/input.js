/**
 * Input handling for touch/mouse controls using Hammer.js
 */

import { CONFIG } from './config.js';

export class InputController extends EventTarget {
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Rotation axis selection
        this.horizontalRotationAxis = CONFIG.DEFAULT_HORIZONTAL_AXIS;
        this.verticalRotationAxis = CONFIG.DEFAULT_VERTICAL_AXIS;

        // Gesture state
        this.swipeDirection = null; // 'horizontal' or 'vertical'
        this.lastPinchScale = 1;
        this.lastPanDelta = { x: 0, y: 0 };

        this.setupHammer();
        this.setupRotationToggles();
        this.setupActionButtons();
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

        // Single-finger pan - for 4D rotation
        this.hammer.on('singlepanstart', () => {
            this.swipeDirection = null;
        });

        this.hammer.on('singlepan', (e) => {
            // Determine swipe direction on first significant movement
            if (!this.swipeDirection) {
                const absDeltaX = Math.abs(e.deltaX);
                const absDeltaY = Math.abs(e.deltaY);

                if (absDeltaX > CONFIG.SWIPE_THRESHOLD || absDeltaY > CONFIG.SWIPE_THRESHOLD) {
                    this.swipeDirection = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
                }
            }

            // Emit rotation event based on swipe direction
            if (this.swipeDirection === 'horizontal') {
                this.dispatchEvent(new CustomEvent('rotate', {
                    detail: {
                        axis: this.horizontalRotationAxis,
                        delta: e.velocityX * CONFIG.ROTATION_SENSITIVITY * 10
                    }
                }));
            } else if (this.swipeDirection === 'vertical') {
                this.dispatchEvent(new CustomEvent('rotate', {
                    detail: {
                        axis: this.verticalRotationAxis,
                        delta: -e.velocityY * CONFIG.ROTATION_SENSITIVITY * 10
                    }
                }));
            }
        });

        this.hammer.on('singlepanend', () => {
            this.swipeDirection = null;
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
                    deltaX: -incrementalDeltaX * 0.01, // Negative for natural direction
                    deltaY: incrementalDeltaY * 0.01
                }
            }));
        });

        this.hammer.on('doublepanend', () => {
            this.lastPanDelta = { x: 0, y: 0 };
        });

        // Pinch - for camera zoom
        this.hammer.on('pinchstart', (e) => {
            this.lastPinchScale = e.scale;
        });

        this.hammer.on('pinch', (e) => {
            const scaleDelta = e.scale - this.lastPinchScale;
            this.lastPinchScale = e.scale;

            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: { delta: -scaleDelta * 3 } // Negative for intuitive zoom
            }));
        });

        this.hammer.on('pinchend', () => {
            this.lastPinchScale = 1;
        });
    }

    /**
     * Setup rotation axis toggle buttons
     */
    setupRotationToggles() {
        // Horizontal swipe rotation axis
        document.querySelectorAll('#horizontal-rotation .rotation-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.querySelectorAll('#horizontal-rotation .rotation-toggle').forEach(t =>
                    t.classList.remove('active'));
                toggle.classList.add('active');
                this.horizontalRotationAxis = toggle.dataset.axis;
            });
        });

        // Vertical swipe rotation axis
        document.querySelectorAll('#vertical-rotation .rotation-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.querySelectorAll('#vertical-rotation .rotation-toggle').forEach(t =>
                    t.classList.remove('active'));
                toggle.classList.add('active');
                this.verticalRotationAxis = toggle.dataset.axis;
            });
        });
    }

    /**
     * Setup action buttons (reset, auto-rotate)
     */
    setupActionButtons() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('reset'));
            });
        }

        const autoRotateBtn = document.getElementById('auto-rotate-btn');
        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('toggleAutoRotate'));
            });
        }
    }

    /**
     * Update auto-rotate button text
     * @param {boolean} autoRotate
     */
    updateAutoRotateButton(autoRotate) {
        const btn = document.getElementById('auto-rotate-btn');
        if (btn) {
            btn.textContent = autoRotate ? '⏸ 自動回転' : '▶ 自動回転';
        }
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
