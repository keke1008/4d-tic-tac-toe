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

        // Drag/swipe state (single finger)
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.swipeDirection = null; // 'horizontal' or 'vertical'

        // Multi-touch state (two-finger gestures)
        this.pointers = new Map(); // pointer ID -> { x, y }
        this.lastPinchDistance = null;
        this.lastTwoFingerCenter = null;

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
    }

    /**
     * Handle pointer down event
     * @param {PointerEvent} e
     */
    onPointerDown(e) {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this.pointers.size === 1) {
            // Single finger - setup for rotation
            this.isDragging = true;
            this.dragStartPos = { x: e.clientX, y: e.clientY };
            this.swipeDirection = null;
        } else if (this.pointers.size === 2) {
            // Two fingers - setup for camera gestures
            this.isDragging = false; // Disable rotation
            this.initializeTwoFingerGesture();
        }
    }

    /**
     * Initialize two-finger gesture tracking
     */
    initializeTwoFingerGesture() {
        const pointerArray = Array.from(this.pointers.values());
        if (pointerArray.length !== 2) return;

        const [p1, p2] = pointerArray;

        // Calculate initial pinch distance
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate initial center point
        this.lastTwoFingerCenter = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    /**
     * Handle pointer move event
     * @param {PointerEvent} e
     */
    onPointerMove(e) {
        // Update pointer position
        if (this.pointers.has(e.pointerId)) {
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        if (this.pointers.size === 2) {
            // Two-finger gestures (camera control)
            this.handleTwoFingerGesture();
        } else if (this.pointers.size === 1 && this.isDragging) {
            // Single-finger rotation
            this.handleSingleFingerRotation(e);
        }
    }

    /**
     * Handle single-finger rotation gesture
     * @param {PointerEvent} e
     */
    handleSingleFingerRotation(e) {
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
     * Handle two-finger pan and pinch gestures
     */
    handleTwoFingerGesture() {
        const pointerArray = Array.from(this.pointers.values());
        if (pointerArray.length !== 2) return;

        const [p1, p2] = pointerArray;

        // Calculate current pinch distance
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate current center point
        const currentCenter = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };

        // Pinch gesture (zoom)
        if (this.lastPinchDistance !== null) {
            const distanceDelta = currentDistance - this.lastPinchDistance;
            if (Math.abs(distanceDelta) > 1) { // Threshold to avoid jitter
                this.dispatchEvent(new CustomEvent('cameraPinch', {
                    detail: { delta: distanceDelta * 0.02 } // Scale factor
                }));
            }
        }

        // Pan gesture (camera movement)
        if (this.lastTwoFingerCenter !== null) {
            const panDeltaX = currentCenter.x - this.lastTwoFingerCenter.x;
            const panDeltaY = currentCenter.y - this.lastTwoFingerCenter.y;

            if (Math.abs(panDeltaX) > 1 || Math.abs(panDeltaY) > 1) {
                this.dispatchEvent(new CustomEvent('cameraPan', {
                    detail: {
                        deltaX: panDeltaX * 0.01, // Scale factors
                        deltaY: -panDeltaY * 0.01
                    }
                }));
            }
        }

        // Update last values
        this.lastPinchDistance = currentDistance;
        this.lastTwoFingerCenter = currentCenter;
    }

    /**
     * Handle pointer up event
     * @param {PointerEvent} e
     */
    onPointerUp(e) {
        this.pointers.delete(e.pointerId);

        if (this.pointers.size === 0) {
            // All fingers lifted
            this.isDragging = false;
            this.swipeDirection = null;
            this.lastPinchDistance = null;
            this.lastTwoFingerCenter = null;
        } else if (this.pointers.size === 1) {
            // Back to single finger - reinitialize rotation
            const remaining = Array.from(this.pointers.values())[0];
            this.isDragging = true;
            this.dragStartPos = { x: remaining.x, y: remaining.y };
            this.swipeDirection = null;
            this.lastPinchDistance = null;
            this.lastTwoFingerCenter = null;
        } else if (this.pointers.size === 2) {
            // Still two fingers - reinitialize two-finger gesture
            this.initializeTwoFingerGesture();
        }
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
