/**
 * Input handling for touch/mouse controls
 */

import { CONFIG } from './config.js';

export class InputController extends EventTarget {
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Rotation axis selection
        this.horizontalRotationAxis = CONFIG.DEFAULT_HORIZONTAL_AXIS;
        this.verticalRotationAxis = CONFIG.DEFAULT_VERTICAL_AXIS;

        // Drag/swipe state
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.swipeDirection = null; // 'horizontal' or 'vertical'

        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Pointer events for unified touch/mouse handling
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));

        // Rotation axis toggles
        this.setupRotationToggles();

        // Action buttons
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

        // Camera distance control
        const cameraDistanceSlider = document.getElementById('camera-distance');
        const cameraDistanceValue = document.getElementById('camera-distance-value');
        if (cameraDistanceSlider && cameraDistanceValue) {
            cameraDistanceSlider.addEventListener('input', (e) => {
                const distance = parseFloat(e.target.value);
                cameraDistanceValue.textContent = distance;
                this.dispatchEvent(new CustomEvent('cameraDistanceChange', {
                    detail: { distance }
                }));
            });
        }

        // Rotation center controls
        ['x', 'y', 'z'].forEach(axis => {
            const slider = document.getElementById(`rotation-center-${axis}`);
            const valueDisplay = document.getElementById(`rotation-center-${axis}-value`);
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const offset = parseFloat(e.target.value);
                    valueDisplay.textContent = offset;
                    this.dispatchEvent(new CustomEvent('rotationCenterChange', {
                        detail: { axis, offset }
                    }));
                });
            }
        });
    }

    /**
     * Handle pointer down event
     * @param {PointerEvent} e
     */
    onPointerDown(e) {
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.swipeDirection = null;
    }

    /**
     * Handle pointer move event
     * @param {PointerEvent} e
     */
    onPointerMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartPos.x;
        const deltaY = e.clientY - this.dragStartPos.y;

        // Determine swipe direction on first significant movement
        if (!this.swipeDirection) {
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (absDeltaX > CONFIG.SWIPE_THRESHOLD || absDeltaY > CONFIG.SWIPE_THRESHOLD) {
                this.swipeDirection = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
            }
        }

        // Emit rotation event based on swipe direction
        if (this.swipeDirection === 'horizontal') {
            this.dispatchEvent(new CustomEvent('rotate', {
                detail: {
                    axis: this.horizontalRotationAxis,
                    delta: deltaX * CONFIG.ROTATION_SENSITIVITY
                }
            }));
        } else if (this.swipeDirection === 'vertical') {
            this.dispatchEvent(new CustomEvent('rotate', {
                detail: {
                    axis: this.verticalRotationAxis,
                    delta: -deltaY * CONFIG.ROTATION_SENSITIVITY
                }
            }));
        }

        this.dragStartPos = { x: e.clientX, y: e.clientY };
    }

    /**
     * Handle pointer up event
     * @param {PointerEvent} e
     */
    onPointerUp(e) {
        this.isDragging = false;
        this.swipeDirection = null;
    }

    /**
     * Handle click event
     * @param {MouseEvent} e
     */
    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.dispatchEvent(new CustomEvent('cellClick', {
            detail: { mouseX, mouseY }
        }));
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
}
