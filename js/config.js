/**
 * Configuration constants for 4D Tic-Tac-Toe
 */

export const VERSION = '3.0.0';

export const CONFIG = {
    // Game settings
    DIMENSIONS: 4,    // Number of dimensions (2-6 supported, tested with 2-4)
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

    // Visual settings - Unified colors for unselected, player colors for selected
    CELL_SCALE_MIN: 0.7,
    CELL_SCALE_RANGE: 0.6,
    CELL_LINE_WIDTH: 2,           // Thicker cell wireframes
    CONNECTION_LINE_WIDTH: 1.5,    // Thicker connection lines

    // Unselected cell appearance - W-based colors, subtle and not too prominent
    HUE_OFFSET: 0.15,              // red-orange hue base
    HUE_RANGE: 0.6,                // color spectrum range
    UNSELECTED_CELL_SATURATION: 0.4,   // Low saturation - subdued colors
    UNSELECTED_CELL_LIGHTNESS: 0.25,   // Low lightness - dark and subtle
    UNSELECTED_CELL_OPACITY_MIN: 0.2,  // Minimum opacity
    UNSELECTED_CELL_OPACITY_RANGE: 0.15, // Opacity variation range

    // Unselected grid appearance - Unified color for all
    UNSELECTED_GRID_COLOR: 0x5a5a7a,   // Slightly brighter gray-blue
    UNSELECTED_GRID_OPACITY: 0.3,      // Visible and recognizable

    // Selected cell appearance - Uses player colors
    SELECTED_CELL_OPACITY: 0.9,        // Bright and prominent
    SELECTED_CELL_LINE_WIDTH: 4,       // Thicker lines for selected cells

    // Hover state - Cells brighten when mouse hovers over them
    HOVER_CELL_LIGHTNESS_BOOST: 0.15,  // Add to lightness when hovering
    HOVER_CELL_OPACITY_BOOST: 0.2,     // Add to opacity when hovering
    HOVER_GRID_OPACITY: 0.45,          // Grid lines connected to hovered cell

    // Preview selection state - After 1st click, before 2nd click confirmation
    PREVIEW_CELL_OPACITY: 0.6,         // Semi-transparent player color
    PREVIEW_GRID_OPACITY: 0.4,         // Moderate grid visibility

    // Selected grid appearance - Based on connection endpoints
    SELECTED_GRID_OPACITY: 0.5,        // Player color, moderate brightness
    SAME_PLAYER_GRID_OPACITY: 0.8,     // Strong color when both ends same player

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
