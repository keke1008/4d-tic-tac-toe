/**
 * Camera controller for managing 3D camera position and orientation
 */

import { CONFIG } from '../config.js';

export class CameraController {
    /**
     * Create a camera controller
     * @param {number} aspect - Initial aspect ratio (width / height)
     */
    constructor(aspect) {
        // Create perspective camera
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA_FOV,
            aspect,
            0.1,
            1000
        );

        // Initialize camera position
        this.camera.position.set(0, 0, CONFIG.CAMERA_DISTANCE);

        // Rotation center (camera look-at target)
        this.rotationCenter = { x: 0, y: 0, z: 0 };
        this.camera.lookAt(
            this.rotationCenter.x,
            this.rotationCenter.y,
            this.rotationCenter.z
        );
    }

    /**
     * Get the Three.js camera instance
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Set camera distance (for pinch zoom)
     * @param {number} distance - Camera distance from origin
     */
    setCameraDistance(distance) {
        // Clamp between min and max
        this.camera.position.z = Math.max(5, Math.min(25, distance));
    }

    /**
     * Adjust camera distance by delta (for pinch gesture)
     * @param {number} delta - Distance change
     */
    adjustCameraDistance(delta) {
        const currentZ = this.camera.position.z;
        this.setCameraDistance(currentZ - delta);
    }

    /**
     * Pan camera position (for two-finger pan gesture)
     * @param {number} deltaX - X movement
     * @param {number} deltaY - Y movement
     */
    panCamera(deltaX, deltaY) {
        // Move camera position
        this.camera.position.x += deltaX;
        this.camera.position.y += deltaY;

        // Move rotation center with camera to maintain view
        this.rotationCenter.x += deltaX;
        this.rotationCenter.y += deltaY;

        // Update camera target
        this.camera.lookAt(
            this.rotationCenter.x,
            this.rotationCenter.y,
            this.rotationCenter.z
        );
    }

    /**
     * Set rotation center offset
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {number} offset - Offset value
     */
    setRotationCenter(axis, offset) {
        this.rotationCenter[axis] = offset;
        this.camera.lookAt(
            this.rotationCenter.x,
            this.rotationCenter.y,
            this.rotationCenter.z
        );
    }

    /**
     * Update camera aspect ratio (for window resize)
     * @param {number} aspect - New aspect ratio (width / height)
     */
    updateAspect(aspect) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Get current rotation center
     * @returns {{x: number, y: number, z: number}}
     */
    getRotationCenter() {
        return { ...this.rotationCenter };
    }
}
