/**
 * Configuration constants for 4D Tic-Tac-Toe
 */

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

    // Visual settings
    CELL_OPACITY_MIN: 0.2,
    CELL_OPACITY_RANGE: 0.3,
    CELL_SCALE_MIN: 0.7,
    CELL_SCALE_RANGE: 0.6,

    CONNECTION_OPACITY_MIN: 0.1,
    CONNECTION_OPACITY_RANGE: 0.15,

    // Color settings (HSL)
    HUE_OFFSET: 0.5,
    HUE_RANGE: 0.33,

    // Marker settings
    MARKER_SCALE: 0.6,
    MARKER_CANVAS_SIZE: 128,

    // Default rotation axes
    DEFAULT_HORIZONTAL_AXIS: 'xw',
    DEFAULT_VERTICAL_AXIS: 'yz',

    // Player colors
    PLAYER_X_COLOR: 0xff00ff,
    PLAYER_O_COLOR: 0x00ffff,

    // Scene settings
    SCENE_BACKGROUND: 0x0a0a1a,
    FOG_NEAR: 10,
    FOG_FAR: 30,

    // Lighting
    AMBIENT_LIGHT_COLOR: 0x404040,
    AMBIENT_LIGHT_INTENSITY: 1,
    POINT_LIGHT_COLOR: 0xffffff,
    POINT_LIGHT_INTENSITY: 1,
    POINT_LIGHT_DISTANCE: 100,
};

export const ROTATION_AXES = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw'];

export const FOUR_D_AXES = ['xw', 'yw', 'zw'];
