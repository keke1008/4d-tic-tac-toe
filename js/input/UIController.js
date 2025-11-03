/**
 * Handles UI button controls and rotation axis toggles
 * Emits normalized UI events for game control
 */

import { CONFIG } from '../config.js';

export class UIController extends EventTarget {
    /**
     * Create a UI controller
     */
    constructor() {
        super();

        // Rotation axis selection
        this.horizontalRotationAxis = CONFIG.DEFAULT_HORIZONTAL_AXIS;
        this.verticalRotationAxis = CONFIG.DEFAULT_VERTICAL_AXIS;

        this.setupRotationToggles();
        this.setupActionButtons();
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

                // Emit axis change event
                this.dispatchEvent(new CustomEvent('axisChange', {
                    detail: {
                        horizontal: this.horizontalRotationAxis,
                        vertical: this.verticalRotationAxis
                    }
                }));
            });
        });

        // Vertical swipe rotation axis
        document.querySelectorAll('#vertical-rotation .rotation-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.querySelectorAll('#vertical-rotation .rotation-toggle').forEach(t =>
                    t.classList.remove('active'));
                toggle.classList.add('active');
                this.verticalRotationAxis = toggle.dataset.axis;

                // Emit axis change event
                this.dispatchEvent(new CustomEvent('axisChange', {
                    detail: {
                        horizontal: this.horizontalRotationAxis,
                        vertical: this.verticalRotationAxis
                    }
                }));
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
     * Get current rotation axes
     * @returns {{horizontal: string, vertical: string}}
     */
    getRotationAxes() {
        return {
            horizontal: this.horizontalRotationAxis,
            vertical: this.verticalRotationAxis
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Event listeners are automatically cleaned up when elements are removed
    }
}
