/**
 * Manager for Three.js scene, renderer, lighting, and raycasting
 * Handles low-level Three.js setup and lifecycle
 */

import { CONFIG } from '../config.js';

export class SceneManager {
    /**
     * Create a scene manager
     * @param {HTMLElement} container - DOM container for renderer
     */
    constructor(container) {
        this.container = container;

        this.setupScene();
        this.setupRenderer();
        this.setupLighting();
        this.setupRaycaster();
        this.setupResizeHandler();
    }

    /**
     * Setup Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.SCENE_BACKGROUND);
        this.scene.fog = new THREE.Fog(
            CONFIG.SCENE_BACKGROUND,
            CONFIG.FOG_NEAR,
            CONFIG.FOG_FAR
        );
    }

    /**
     * Setup WebGL renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Setup scene lighting
     */
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(
            CONFIG.AMBIENT_LIGHT_COLOR,
            CONFIG.AMBIENT_LIGHT_INTENSITY
        );
        this.scene.add(ambientLight);

        // Point light for highlights
        const pointLight = new THREE.PointLight(
            CONFIG.POINT_LIGHT_COLOR,
            CONFIG.POINT_LIGHT_INTENSITY,
            CONFIG.POINT_LIGHT_DISTANCE
        );
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);
    }

    /**
     * Setup raycaster for click detection
     */
    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
    }

    /**
     * Setup window resize handler
     */
    setupResizeHandler() {
        this.resizeCallback = null;
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );

        // Call external resize callback if set
        if (this.resizeCallback) {
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.resizeCallback(aspect);
        }
    }

    /**
     * Set resize callback for external components (like CameraController)
     * @param {Function} callback - Callback function(aspect)
     */
    setResizeCallback(callback) {
        this.resizeCallback = callback;
    }

    /**
     * Get the Three.js scene
     * @returns {THREE.Scene}
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the Three.js renderer
     * @returns {THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get the raycaster
     * @returns {THREE.Raycaster}
     */
    getRaycaster() {
        return this.raycaster;
    }

    /**
     * Get the canvas element
     * @returns {HTMLCanvasElement}
     */
    getCanvas() {
        return this.renderer.domElement;
    }

    /**
     * Render the scene with given camera
     * @param {THREE.Camera} camera - Camera to render with
     */
    render(camera) {
        this.renderer.render(this.scene, camera);
    }

    /**
     * Add object to scene
     * @param {THREE.Object3D} object - Object to add
     */
    add(object) {
        this.scene.add(object);
    }

    /**
     * Remove object from scene
     * @param {THREE.Object3D} object - Object to remove
     */
    remove(object) {
        this.scene.remove(object);
    }

    /**
     * Get container aspect ratio
     * @returns {number} Width / height
     */
    getAspect() {
        return this.container.clientWidth / this.container.clientHeight;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Remove resize event listener
        window.removeEventListener('resize', this.handleResize.bind(this));

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // Clear scene
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }
    }
}
