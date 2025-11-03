/**
 * Input handling for touch/mouse controls using Hammer.js
 */

import { CONFIG } from './config.js';
import { GestureHandler } from './input/GestureHandler.js';
import { MouseController } from './input/MouseController.js';

export class InputController extends EventTarget {
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Rotation axis selection
        this.horizontalRotationAxis = CONFIG.DEFAULT_HORIZONTAL_AXIS;
        this.verticalRotationAxis = CONFIG.DEFAULT_VERTICAL_AXIS;

        this.setupGestureHandler();
        this.setupMouseController();
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
        if (this.mouseController) {
            this.mouseController.destroy();
        }
    }
}
