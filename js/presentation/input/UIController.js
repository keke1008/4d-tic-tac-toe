/**
 * UI Controller for Presentation Layer (Phase 4)
 * Handles UI button controls and rotation axis toggles
 * Emits normalized UI events for game control
 */

import { CONFIG } from '../../config.js';

/**
 * UIController - handles UI button interactions
 */
export class UIController extends EventTarget {
    /**
     * Create a UI controller
     * @param {EventBus} eventBus - Event bus instance (optional)
     * @param {StateStore} stateStore - State store instance (optional)
     */
    constructor(eventBus = null, stateStore = null) {
        super();
        this.eventBus = eventBus;
        this.store = stateStore;

        // Rotation axis selection
        this.horizontalRotationAxis = CONFIG.DEFAULT_HORIZONTAL_AXIS;
        this.verticalRotationAxis = CONFIG.DEFAULT_VERTICAL_AXIS;

        this.setupRotationToggles();
        this.setupActionButtons();
    }

    /**
     * Setup rotation axis toggle buttons
     * @private
     */
    setupRotationToggles() {
        // Horizontal swipe rotation axis
        document.querySelectorAll('#horizontal-rotation .rotation-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.querySelectorAll('#horizontal-rotation .rotation-toggle').forEach(t =>
                    t.classList.remove('active'));
                toggle.classList.add('active');
                this.horizontalRotationAxis = toggle.dataset.axis;

                const detail = {
                    horizontal: this.horizontalRotationAxis,
                    vertical: this.verticalRotationAxis
                };

                // Emit axis change event (legacy)
                this.dispatchEvent(new CustomEvent('axisChange', { detail }));

                // Also emit to EventBus if available
                if (this.eventBus) {
                    this.eventBus.emit('ui:axisChange', detail);
                }
            });
        });

        // Vertical swipe rotation axis
        document.querySelectorAll('#vertical-rotation .rotation-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.querySelectorAll('#vertical-rotation .rotation-toggle').forEach(t =>
                    t.classList.remove('active'));
                toggle.classList.add('active');
                this.verticalRotationAxis = toggle.dataset.axis;

                const detail = {
                    horizontal: this.horizontalRotationAxis,
                    vertical: this.verticalRotationAxis
                };

                // Emit axis change event (legacy)
                this.dispatchEvent(new CustomEvent('axisChange', { detail }));

                // Also emit to EventBus if available
                if (this.eventBus) {
                    this.eventBus.emit('ui:axisChange', detail);
                }
            });
        });
    }

    /**
     * Setup action buttons (reset, auto-rotate, settings, help)
     * @private
     */
    setupActionButtons() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                // Dispatch legacy event
                this.dispatchEvent(new CustomEvent('reset'));

                // Also emit to EventBus if available
                if (this.eventBus) {
                    this.eventBus.emit('ui:reset', {});
                }
            });
        }

        const autoRotateBtn = document.getElementById('auto-rotate-btn');
        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', () => {
                // Dispatch legacy event
                this.dispatchEvent(new CustomEvent('toggleAutoRotate'));

                // Also emit to EventBus if available
                if (this.eventBus) {
                    this.eventBus.emit('ui:toggleAutoRotate', {});
                }
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

                // Emit to EventBus if available
                if (this.eventBus) {
                    this.eventBus.emit('ui:settingsToggle', {
                        collapsed: advancedControls.classList.contains('collapsed')
                    });
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

                // Emit to EventBus if available
                if (this.eventBus) {
                    this.eventBus.emit('ui:helpToggle', {
                        collapsed: helpText.classList.contains('collapsed')
                    });
                }
            });
        }
    }

    /**
     * Update auto-rotate button icon
     * @param {boolean} autoRotate - Auto-rotate enabled
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
     * @returns {{horizontal: string, vertical: string}} Rotation axes
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
