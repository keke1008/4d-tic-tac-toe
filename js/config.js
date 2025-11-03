/**
 * Configuration constants for 4D Tic-Tac-Toe
 */

export const VERSION = '1.3.0';

export const CONFIG = {
    // Game settings
    GRID_SIZE: 4,
    CELL_SPACING: 1.2,
    CELL_SIZE: 0.4,

    // Rotation settings
    ROTATION_SPEED: 0.005,
    ROTATION_SENSITIVITY: 0.01,
    SWIPE_THRESHOLD: 5, // pixels

    // Projection settings
    PROJECTION_DISTANCE_4D: 3,
    CAMERA_DISTANCE: 12,
    CAMERA_FOV: 60,
    CAMERA_DISTANCE_MIN: 8,
    CAMERA_DISTANCE_MAX: 20,

    // Visual settings - Enhanced for better visibility
    CELL_OPACITY_MIN: 0.5,        // Increased from 0.2
    CELL_OPACITY_RANGE: 0.4,      // Increased from 0.3
    CELL_SCALE_MIN: 0.7,
    CELL_SCALE_RANGE: 0.6,
    CELL_LINE_WIDTH: 2,           // New: Thicker cell wireframes

    CONNECTION_OPACITY_MIN: 0.25,  // Increased from 0.1
    CONNECTION_OPACITY_RANGE: 0.25, // Increased from 0.15
    CONNECTION_LINE_WIDTH: 1.5,    // New: Thicker connection lines

    // Color settings (HSL) - More vibrant range
    HUE_OFFSET: 0.15,              // Changed from 0.5 (red-orange)
    HUE_RANGE: 0.6,                // Increased from 0.33 (wider spectrum)
    SATURATION: 1.0,               // Full saturation
    LIGHTNESS: 0.6,                // Brighter

    // Marker settings - Larger and more visible
    MARKER_SCALE: 0.8,             // Increased from 0.6
    MARKER_CANVAS_SIZE: 128,
    MARKED_CELL_OPACITY: 0.9,      // New: High opacity for marked cells
    MARKED_CELL_LINE_WIDTH: 3,     // New: Thick lines for marked cells

    // Default rotation axes
    DEFAULT_HORIZONTAL_AXIS: 'xw',
    DEFAULT_VERTICAL_AXIS: 'yz',

    // Player colors - More vibrant
    PLAYER_X_COLOR: 0xff00ff,      // Magenta
    PLAYER_O_COLOR: 0x00ffff,      // Cyan

    // Scene settings
    SCENE_BACKGROUND: 0x0a0a1a,
    FOG_NEAR: 10,
    FOG_FAR: 30,

    // Lighting - Brighter
    AMBIENT_LIGHT_COLOR: 0x606060, // Increased from 0x404040
    AMBIENT_LIGHT_INTENSITY: 1.5,  // Increased from 1
    POINT_LIGHT_COLOR: 0xffffff,
    POINT_LIGHT_INTENSITY: 1.2,    // Increased from 1
    POINT_LIGHT_DISTANCE: 100,

    // Grid center offset (for adjusting rotation center)
    GRID_CENTER_OFFSET: { x: 0, y: 0, z: 0 },
};

export const ROTATION_AXES = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw'];

export const FOUR_D_AXES = ['xw', 'yw', 'zw'];
