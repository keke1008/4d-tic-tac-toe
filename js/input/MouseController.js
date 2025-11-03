/**
 * Handles mouse controls for PC users
 * Emits normalized mouse events for camera control
 */

export class MouseController extends EventTarget {
    /**
     * Create a mouse controller
     * @param {HTMLCanvasElement} canvas - Canvas element to attach mouse events to
     */
    constructor(canvas) {
        super();
        this.canvas = canvas;

        // Mouse state
        this.isMouseDragging = false;
        this.lastMousePos = { x: 0, y: 0 };

        this.setupMouseControls();
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
     * Cleanup resources
     */
    destroy() {
        // Event listeners are automatically cleaned up when the element is removed
        // but we can reset state here
        this.isMouseDragging = false;
        this.canvas.style.cursor = 'default';
    }
}
