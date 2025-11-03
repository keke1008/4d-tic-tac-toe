/**
 * Input handling for touch/mouse controls using Hammer.js
 */

import { CONFIG } from './config.js';
import { GestureHandler } from './input/GestureHandler.js';

export class InputController extends EventTarget {
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Rotation axis selection
        this.horizontalRotationAxis = CONFIG.DEFAULT_HORIZONTAL_AXIS;
        this.verticalRotationAxis = CONFIG.DEFAULT_VERTICAL_AXIS;

        // Mouse state
        this.isMouseDragging = false;
        this.lastMousePos = { x: 0, y: 0 };

        this.setupGestureHandler();
        this.setupMouseControls();
        this.setupRotationToggles();
        this.setupActionButtons();
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

        // Forward rotation events with axis information
        this.gestureHandler.addEventListener('rotateHorizontal', (e) => {
            this.dispatchEvent(new CustomEvent('rotate', {
                detail: {
                    axis: this.horizontalRotationAxis,
                    delta: e.detail.delta
                }
            }));
        });

        this.gestureHandler.addEventListener('rotateVertical', (e) => {
            this.dispatchEvent(new CustomEvent('rotate', {
                detail: {
                    axis: this.verticalRotationAxis,
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
     * Setup mouse controls for PC users
     */
    setupMouseControls() {
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Normalize wheel delta (different browsers have different scales)
            const delta = -e.deltaY * 0.01;

            this.dispatchEvent(new CustomEvent('cameraPinch', {
                detail: { delta: delta }
            }));
        }, { passive: false });

        // Mouse drag with Shift for camera pan
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.shiftKey) {
                this.isMouseDragging = true;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.canvas.style.cursor = 'grab';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isMouseDragging && e.shiftKey) {
                const deltaX = e.clientX - this.lastMousePos.x;
                const deltaY = e.clientY - this.lastMousePos.y;
                this.lastMousePos = { x: e.clientX, y: e.clientY };

                this.dispatchEvent(new CustomEvent('cameraPan', {
                    detail: {
                        deltaX: -deltaX * 0.01,
                        deltaY: deltaY * 0.01
                    }
                }));
                this.canvas.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isMouseDragging) {
                this.isMouseDragging = false;
                this.canvas.style.cursor = 'default';
            }
        });

        // Stop dragging if Shift key is released
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift' && this.isMouseDragging) {
                this.isMouseDragging = false;
                this.canvas.style.cursor = 'default';
            }
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
     * Setup action buttons (reset, auto-rotate, settings, help)
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

        // Settings toggle button
        const settingsToggleBtn = document.getElementById('settings-toggle-btn');
        const advancedControls = document.getElementById('advanced-controls');
        if (settingsToggleBtn && advancedControls) {
            settingsToggleBtn.addEventListener('click', () => {
                advancedControls.classList.toggle('collapsed');
                // Close help when opening settings
                if (!advancedControls.classList.contains('collapsed')) {
                    const helpText = document.getElementById('help-text');
                    if (helpText) helpText.classList.add('collapsed');
                }
            });
        }

        // Help toggle button
        const helpBtn = document.getElementById('help-btn');
        const helpText = document.getElementById('help-text');
        if (helpBtn && helpText) {
            helpBtn.addEventListener('click', () => {
                helpText.classList.toggle('collapsed');
                // Close settings when opening help
                if (!helpText.classList.contains('collapsed')) {
                    if (advancedControls) advancedControls.classList.add('collapsed');
                }
            });
        }
    }

    /**
     * Update auto-rotate button icon
     * @param {boolean} autoRotate
     */
    updateAutoRotateButton(autoRotate) {
        const btn = document.getElementById('auto-rotate-btn');
        if (btn) {
            btn.textContent = autoRotate ? '⏸' : '▶';
            btn.title = autoRotate ? '自動回転を停止' : '自動回転を開始';
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.gestureHandler) {
            this.gestureHandler.destroy();
        }
    }
}
