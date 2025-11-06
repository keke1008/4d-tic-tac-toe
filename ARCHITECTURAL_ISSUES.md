# 4D Tic-Tac-Toe: Architectural Analysis Report

## Executive Summary

The 4D Tic-Tac-Toe codebase is undergoing a significant architectural refactoring (v3.3.1 → v4.0.0) to address fundamental design issues. While the new architecture (Phases 1-4) shows promising improvements in structure and testability, several root causes of bugs and complexity persist:

1. **Hybrid Architecture**: New layered architecture coexists with legacy monolithic components
2. **State Synchronization**: Visual state (renderer) not automatically synced with application state
3. **Tightly Coupled Components**: Renderer directly depends on legacy GridRenderer with manual synchronization
4. **Event-Driven Complexity**: Manual ordering requirements for event listeners to prevent visual glitches
5. **Global Configuration Mutation**: CONFIG object directly modified at runtime, creating hidden state
6. **Heavy Operations in Event Listeners**: Grid recreation and Three.js resource management in event handlers

---

## 1. Overall Architecture

### Current Technology Stack
- **Language**: JavaScript (ES6 modules)
- **3D Graphics**: Three.js
- **Testing**: Vitest (Vitest UI, coverage with v8)
- **Architecture Pattern**: Hybrid (Layered + Legacy Monolithic)
- **State Management**: Redux-like centralized store (new) + distributed renderer state (legacy)

### Directory Structure
```
js/
├── main.js                           # Orchestrator (465 lines) - MONOLITHIC
├── renderer.js                       # 3D visualization (432 lines) - LEGACY
├── config.js                         # Global configuration (mutable)
├── mathnd.js                         # N-dimensional math utilities (270 lines)
│
├── infrastructure/                   # NEW ARCHITECTURE (Phase 1)
│   ├── state/
│   │   ├── StateStore.js            # Redux-like store
│   │   ├── reducers.js              # Root reducer (286 lines)
│   │   └── actions.js               # Action creators (148 lines)
│   ├── events/
│   │   └── EventBus.js              # Pub/sub event system (167 lines)
│   └── config/
│       └── ConfigManager.js         # Config abstraction (230 lines)
│
├── domain/                           # NEW ARCHITECTURE (Phase 2)
│   ├── state/
│   │   ├── GameState.js             # Immutable game state (162 lines)
│   │   └── BoardState.js            # Board representation (201 lines)
│   └── rules/
│       ├── GameRules.js             # Pure business logic (153 lines)
│       └── WinChecker.js            # Victory detection (136 lines)
│
├── application/                      # NEW ARCHITECTURE (Phase 3)
│   ├── services/
│   │   └── GameService.js           # Use cases/commands (336 lines)
│   └── commands/
│       └── (PlaceMarkerCommand.js, etc.)
│
├── presentation/                     # NEW ARCHITECTURE (Phase 4 - Partial)
│   ├── ui/
│   │   ├── UIManager.js             # UI orchestration (156 lines)
│   │   └── SettingsModal.js         # Settings UI (272 lines)
│   └── input/
│       ├── InputController.js       # Input coordination (207 lines)
│       ├── MouseController.js
│       └── GestureHandler.js        (216 lines)
│
├── rendering/                        # LEGACY (being refactored)
│   ├── SceneManager.js              # Three.js scene wrapper
│   ├── CameraController.js
│   ├── MarkerRenderer.js            # Marker visual management
│   └── CellAppearanceManager.js     # Cell color/appearance
│
├── grid/                             # LEGACY
│   ├── GridBuilder.js               # Grid cell generation (188 lines)
│   └── ConnectionManager.js         # Connection line management (180 lines)
│
├── game/
│   └── RotationInitializer.js
│
└── utils/
    └── BoardAccessor.js
```

### Architecture Layers (Desired vs Current)

**Desired (v4.0.0 Design)**:
```
┌─────────────────────────────────────┐
│    Presentation Layer               │
│  (UI, Input, Rendering)             │
└────────┬────────────────────────────┘
         │ depends on
┌────────▼─────────────────────────────┐
│   Application Layer                 │
│  (Services, Commands, Queries)      │
└────────┬────────────────────────────┘
         │ depends on
┌────────▼─────────────────────────────┐
│    Domain Layer                     │
│  (GameState, GameRules, Entities)   │
└────────┬────────────────────────────┘
         │ depends on
┌────────▼─────────────────────────────┐
│  Infrastructure Layer               │
│ (StateStore, EventBus, Config)      │
└─────────────────────────────────────┘
```

**Current Reality (Hybrid - Problematic)**:
```
main.js (Orchestrator)
  ├─ Tight coupling to GridRenderer (legacy 3D viewport)
  ├─ Event listener setup (many interdependencies)
  ├─ Manual state synchronization
  ├─ Manual visual updates
  │
  ├──> GameService (new, clean)
  │      ├─ StateStore (good)
  │      └─ EventBus (good)
  │
  ├──> GridRenderer (legacy monolith)
  │      ├─ Direct THREE.js management
  │      ├─ Mutable cell objects with floating state
  │      ├─ Manual marker/connection management
  │      └─ Hover state (grid-local, not in store)
  │
  └──> Renderer/SceneManager (legacy)
         ├─ Scene, camera, raycaster
         └─ Direct Canvas manipulation
```

---

## 2. State Management Issues

### Problem: Distributed State of Truth

State exists in three different locations:

**1. Application State (StateStore - Clean)**
```javascript
// File: infrastructure/state/reducers.js
{
    game: {
        currentPlayer: 'X',
        moveHistory: [{position: [0,0,0,0], player: 'X'}, ...],
        redoStack: [],
        winner: null,
        gamePhase: 'playing'
    },
    settings: {
        dimensions: 4,
        gridSize: 4
    },
    visual: {
        rotation: {xy: 0.5, xz: 1.2, ...},
        cameraPosition: {x: 0, y: 0, z: 12},
        hoveredCell: null,
        previewCell: null,
        autoRotate: true
    },
    ui: {
        settingsModalOpen: false,
        status: 'プレイヤー X のターン'
    }
}
```

**2. Renderer State (GridRenderer - NOT synced)**
```javascript
// File: renderer.js / GridRenderer class
this.cells = [];          // Array of cell objects with:
                          //   - posND (N-dimensional position)
                          //   - group (THREE.Group)
                          //   - wireframe (THREE.LineSegments)
                          //   - marker (boolean)
                          //   - isSelected (boolean)
                          //   - player ('X' or 'O')
                          //   - previewPlayer
this.hoveredCell = null;  // ⚠️ Local state, not in StateStore
this.previewCell = null;  // ⚠️ Local state, not in StateStore
```

**3. Configuration State (Global - Mutable)**
```javascript
// File: config.js
export const CONFIG = {
    DIMENSIONS: 4,      // ⚠️ Directly mutated at runtime!
    GRID_SIZE: 4,       // ⚠️ Directly mutated at runtime!
    // ... many constants
};
```

### Impact of Distributed State

**Bug Pattern 1: Visual State Out of Sync**
```javascript
// File: renderer.js, recreateGrid() method (line 399)
recreateGrid(dimensions, gridSize) {
    // ... clears and recreates grid ...
    CONFIG.DIMENSIONS = dimensions;      // ⚠️ Mutates global
    CONFIG.GRID_SIZE = gridSize;         // ⚠️ Mutates global
    // Now StateStore.state.settings has different values than CONFIG!
}
```

**Bug Pattern 2: Hover State Not in State Store**
```javascript
// File: renderer.js, setupHoverDetection() (line 75)
setupHoverDetection() {
    canvas.addEventListener('mousemove', (e) => {
        const cell = this.getCellAtMouse(mouseX, mouseY);
        if (cell !== this.hoveredCell) {
            this.hoveredCell = cell;  // ⚠️ Local mutation
        }
    });
}

// But main.js also tracks it differently:
// File: main.js, onStateChange() (line 81)
if (state.visual.previewCell !== this._lastPreviewCell) {
    // This doesn't track renderer.hoveredCell!
}
```

**Bug Pattern 3: Multiple Copies of Marker State**
```javascript
// Marker state exists in THREE places:

// 1. StateStore - clean
state.game.moveHistory[i].position
state.game.moveHistory[i].player

// 2. Renderer cells - local objects  
cell.marker (boolean)
cell.player ('X' or 'O')
cell.isSelected (boolean)

// 3. MarkerRenderer - cell.wireframe.material (THREE.js)
cell.wireframe.material.color
cell.wireframe.material.opacity
```

### Recent Bugs Caused by State Sync Issues

From git history:
1. **"Fix grid visual state not resetting on game reset"** (934c4ee)
   - Problem: Renderer state not cleared when GameState was reset
   - Cause: No automatic sync from StateStore to Renderer

2. **"Fix grid markers not clearing on game reset"** (35bedd9)
   - Problem: MarkerRenderer cells still had color despite state being reset
   - Cause: Manual clearing required in event listener

3. **"Fix connection lines not being cleared on grid recreation"** (5da88f7)
   - Problem: ConnectionManager.connectionLines array not cleared
   - Cause: Manual clear() call required in recreateGrid()

4. **"Fix settings change order to properly clear markers"** (b58a435)
   - Problem: Grid recreated before markers cleared, causing visual glitch
   - Cause: Event listener ordering issue (no dependency management)

---

## 3. Code Organization & Coupling Issues

### Issue 1: Monolithic main.js (465 lines)

**Responsibilities**:
1. Game orchestration and initialization
2. Event listener setup (game events, input events, settings events)
3. State subscription and UI synchronization
4. Manual synchronization of:
   - Preview cell state
   - Auto-rotate state
   - Rotation values
   - Status display
5. Animation loop with auto-rotation
6. Handle cell clicks, undo/redo
7. Settings change orchestration with specific event ordering

**Problems**:
- Mixes orchestration logic with presentation concerns
- Multiple state change listeners doing manual updates
- "Glue code" between new and legacy architecture
- Difficult to test due to hard-coded dependencies

### Issue 2: Monolithic GridRenderer (432 lines)

**Responsibilities**:
1. THREE.js scene initialization
2. Grid cell creation and mesh management
3. Connection line management
4. Hover detection via mouse move listener
5. Raycasting for cell selection
6. Cell position updates based on rotation
7. Camera control delegation
8. Marker creation/deletion
9. Preview selection management
10. Grid recreation with resource cleanup
11. Scene disposal and garbage collection

**Problems**:
- Too many responsibilities
- Hard-coded Three.js implementation (not injectable)
- Manual resource management for grid recreation
- Mixed concerns: data structure (cells array), visualization (THREE.js), interaction (hover detection)

**Code Size Comparison**:
```
GridRenderer: 432 lines (ONE class)
vs
Recommended split:
  - GridBuilder: 188 lines ✓ (already split)
  - GridRenderer: ~150 lines (just coordination)
  - CellRenderer: ~80 lines (individual cell creation)
  - ConnectionManager: 180 lines ✓ (already split)
  - CellAppearanceManager: ~92 lines ✓ (already split)
```

### Issue 3: Tight Coupling to Legacy Components

**Dependency Chain (Problem)**:
```
main.js
  └─> GridRenderer (hard-coded in constructor)
       ├─> SceneManager (hard-coded)
       │    └─> THREE.Scene, THREE.Renderer (hard-coded)
       ├─> CameraController (hard-coded)
       ├─> GridBuilder (hard-coded instantiation)
       ├─> ConnectionManager (hard-coded instantiation)
       ├─> MarkerRenderer (hard-coded instantiation)
       ├─> CellAppearanceManager (hard-coded instantiation)
       └─> CONFIG (global import)
           └─> ROTATION_AXES (global import)
```

**Why This Is Problematic**:
- Cannot test GridRenderer without Three.js (needs DOM)
- Cannot swap implementations (e.g., for testing with mock renderer)
- Cannot lazy-load or conditionally create renderer
- Changes to Three.js require modifying all dependent classes

### Issue 4: Circular Event Dependencies

**Evidence from FREEZE_CAUSE_ANALYSIS.md**:

The freeze bug (commit 59ed503) revealed action dispatch chains:

```
SettingsModal.handleApply()
  → Action #1: updateSettings dispatch
    → StateStore._notifyListeners()
      → main.onStateChange() [1st call]
        → updateStatus() [1st call]
  
  → Callback: onApply(dims, gridSize)
    → main.handleSettingsChange()
      → Action #2: updateSettings dispatch (DUPLICATE!)
        → StateStore._notifyListeners()
          → main.onStateChange() [2nd call]
            → updateStatus() [2nd call]
      
      → Action #3: resetGame dispatch (3rd action)
        → StateStore._notifyListeners()
          → main.onStateChange() [3rd call]
            → updateStatus() [3rd call]
      
      → renderer.recreateGrid() (HEAVY THREE.JS operation)
        → updateStatus() [4th direct call]
```

**Result**: 
- GameState.initial() called 3 times
- updateStatus() called 4 times
- THREE.js heavy operations (scene.remove all, recreate all) with no batching

### Issue 5: Event Listener Ordering Dependency

**File: main.js, setupEventListeners() (line 109)**

```javascript
// CRITICAL ORDERING REQUIREMENT (lines 350-390):
// Must call resetGameState() BEFORE updateSettings()
// to guarantee moveHistory is empty when grid is recreated

handleSettingsChange(dimensions, gridSize) {
    // Step 1: Reset game state FIRST
    this.gameService.resetGameState();
    
    // Step 2: Update settings (triggers grid recreation)
    this.gameService.updateSettings({ dimensions, gridSize });
    
    // NOTE: Grid recreation and UI updates are handled by event listeners
    // This prevents circular dependencies and keeps the flow one-directional
}
```

**Why This Is Fragile**:
- Documentation comments are the only "contract"
- No compile-time enforcement
- Any future refactoring could break this
- Requires understanding the entire event flow to modify safely
- Different from declarative dependency specification

---

## 4. Common Bug Patterns

### Pattern 1: Visual State Reset Issues

**Affected Systems**: 
- Grid appearance after reset
- Marker colors after game reset
- Connection line colors after grid recreation

**Root Cause**:
```javascript
// Issue: MarkerRenderer.clearMarkerFromCell() sets temporary color
cell.wireframe.material.color.setHex(0x4a4a6a);  // Neutral gray-blue

// But this DOESN'T update based on W coordinate!
// The correct W-based color only comes from:
// CellAppearanceManager.applyUnselectedAppearance() 
// which is called from:
// renderer.updateCellPositions() 
// which must be called after clearing
```

**Fix Pattern** (from code):
```javascript
// File: renderer.js, clearMarkers() (line 243)
clearMarkers() {
    this.markerRenderer.clearAllMarkers(this.cells);
    this.clearPreviewSelection();
    
    // Update cell appearances immediately to reflect cleared states
    this.updateCellPositions();  // ⚠️ REQUIRED CALL
    
    // Update connection lines immediately
    this.updateConnectionLines();  // ⚠️ REQUIRED CALL
}
```

**Why It's Fragile**:
- Requires manual ordering of calls
- No automatic dependency resolution
- Easy to forget when adding new clearing logic

### Pattern 2: Resource Cleanup Issues

**Affected Systems**:
- Connection lines not cleared
- Grid cells not disposed
- Three.js materials/geometries not released

**Root Cause**:
```javascript
// File: renderer.js, recreateGrid() (line 399-431)
recreateGrid(dimensions, gridSize) {
    // Step 1: Clear existing grid
    this.cells.forEach(cell => {
        if (cell.group) {
            this.sceneManager.scene.remove(cell.group);  // Remove from scene
        }
    });
    
    // Step 2: Clear connections ⚠️ Easy to forget!
    if (this.connectionManager) {
        this.connectionManager.clear();  // Must be called explicitly
    }
    
    // Step 3: Clear arrays
    this.cells = [];
    this.cellMeshes = [];
    
    // ... recreate ...
}
```

**Why It's Fragile**:
- ConnectionManager has separate clear() that must be called
- No unified cleanup mechanism
- Each manager has different cleanup requirements

### Pattern 3: Duplicate Action Dispatches

**Evidence**: FREEZE_CAUSE_ANALYSIS.md documents this

```javascript
// Cause: SettingsModal dispatches action directly
// File: presentation/ui/SettingsModal.js, handleApply()
this.store.dispatch(Actions.updateSettings(newSettings));  // Action #1

// THEN calls callback
this.onApply(dimensions, gridSize);

// WHICH calls main.handleSettingsChange()
// WHICH calls gameService.updateSettings()
// File: application/services/GameService.js, updateSettings()
this.store.dispatch(Actions.updateSettings(newSettings));  // Action #2 - DUPLICATE!
```

**Result**:
- Same action dispatched twice
- State subscribers notified twice
- Heavy operations triggered twice

---

## 5. Testing & Maintainability

### Test Coverage

**Existing Tests** (2,954 lines of test code):
```
StateStore.test.js          328 lines   ✓ Infrastructure layer
EventBus.test.js            329 lines   ✓ Infrastructure layer  
reducers.test.js            302 lines   ✓ State management
GameRules.test.js           459 lines   ✓ Domain layer
WinChecker.test.js          313 lines   ✓ Domain layer
GameState.test.js           173 lines   ✓ Domain layer
BoardState.test.js          196 lines   ✓ Domain layer
GameService.test.js         261 lines   ✓ Application layer
ConfigManager.test.js       367 lines   ✓ Infrastructure
benchmarks.test.js          226 lines   ✓ Performance
────────────────────────────────────────
TOTAL                     2,954 lines
```

**NOT Tested** (No tests):
- main.js (465 lines) ❌ Orchestration logic
- GridRenderer (432 lines) ❌ 3D rendering
- renderer.js (432 lines) ❌ Presentation
- InputController (207 lines) ❌ Input handling
- GestureHandler (216 lines) ❌ Gestures
- SettingsModal (272 lines) ❌ Settings UI
- UIManager (156 lines) ❌ UI management
- CellAppearanceManager (92 lines) ❌ Visual appearance
- MarkerRenderer (94 lines) ❌ Marker rendering
- ConnectionManager (180 lines) ❌ Connection lines
- All rendering logic (~500 lines) ❌

**Coverage Gap**:
- Infrastructure: ~95% covered ✓
- Domain: ~90% covered ✓
- Application: ~75% covered ⚠️
- Presentation: ~0% covered ❌
- Rendering: ~0% covered ❌
- **Overall**: ~40-50% estimated coverage

### Testability Issues

**1. Hard-Coded Dependencies** (Cannot mock)
```javascript
// GridRenderer constructor
constructor(container) {
    this.container = container;
    this.sceneManager = new SceneManager(this.container);  // Can't mock
    this.cameraController = new CameraController(aspect);   // Can't mock
    this.markerRenderer = new MarkerRenderer();             // Can't mock
}
```

**2. DOM Dependencies** (Cannot test without DOM)
```javascript
// GridRenderer needs actual DOM
const container = document.getElementById('canvas-container');
this.renderer = new GridRenderer(container);  // Will fail in test
```

**3. Global State Dependencies**
```javascript
// Functions depend on global CONFIG
CONFIG.DIMENSIONS  // Changes affect behavior
CONFIG.GRID_SIZE   // No way to isolate tests
```

**4. No Interfaces/Abstractions**
```javascript
// How to test with mock renderer?
// There's no IRenderer interface, no dependency injection
// GridRenderer is tightly bound to THREE.js
```

---

## 6. Specific Problem Areas

### Area 1: state/reducers.js (286 lines)

**Issue**: GameState initialization happens in two places:

```javascript
// File: infrastructure/state/reducers.js, line 91
case ActionTypes.RESET_GAME: {
    const newGameState = GameRules.reset(
        GameState.initial(settings)  // ⚠️ Initialization #1
    );
    return newGameState.toPlain();
}

// File: infrastructure/state/reducers.js, line 142
case ActionTypes.UPDATE_SETTINGS: {
    const newGameState = GameRules.updateSettings(
        gameState,
        newSettings
    );
    // Should this also call GameState.initial()?
}
```

**And also in GameService**:
```javascript
// File: application/services/GameService.js, line 91
const settings = this.store.getState().settings;
this.store.dispatch(Actions.resetGame(settings));
// Plus the reducer does GameState.initial() AGAIN
```

### Area 2: main.js (465 lines)

**Issue**: Too many concerns mixed together

```javascript
// Lines 67-99: State subscription setup
setupStateSubscription() { ... }

// Lines 100-155: Event listener setup (40 different listeners!)
setupEventListeners() {
    // game:markerPlaced event
    // game:stateReset event
    // game:moveUndone event
    // game:moveRedone event
    // settings:changed event
    // inputController rotate event
    // inputController cellClick event
    // inputController reset event
    // inputController toggleAutoRotate event
    // inputController cameraPinch event
    // inputController cameraPan event
    // undo button click
    // redo button click
}

// Lines 267-290: Manual synchronization
setupLegacyIntegration() { ... }

// Lines 310-340: Undo/redo implementation
handleUndo() { ... }
handleRedo() { ... }

// Lines 350-390: Settings change orchestration
handleSettingsChange(dimensions, gridSize) { ... }

// Lines 410-432: Status display update
updateStatus() { ... }

// Lines 437-453: Animation loop
animate() { ... }
```

**Should Be Split Into**:
- GameOrchestrator - initialization, event setup
- GameStateSync - state subscription and sync
- GameInputHandler - input event handling  
- GameUIManager - status display updates
- GameRenderingManager - rendering updates

### Area 3: GridRenderer recreateGrid() (lines 399-431)

**Issues**:
1. Modifies global CONFIG
2. Does manual Three.js cleanup
3. Recreates all objects instead of updating
4. No batch operations (removes/adds thousands of objects one-by-one)

```javascript
recreateGrid(dimensions, gridSize) {
    // ⚠️ Issue 1: Modifies global state
    CONFIG.DIMENSIONS = dimensions;
    CONFIG.GRID_SIZE = gridSize;
    
    // ⚠️ Issue 2: Manual cleanup
    this.cells.forEach(cell => {
        if (cell.group) {
            this.sceneManager.scene.remove(cell.group);  // One by one
        }
    });
    
    // ⚠️ Issue 3: No batching
    // For 4D grid with size 4: 4^4 = 256 cells
    // This does 256 scene.remove() calls
    
    // ⚠️ Issue 4: Separate manager cleanup
    if (this.connectionManager) {
        this.connectionManager.clear();  // Easy to forget!
    }
    
    // Then recreates everything
    this.createGrid();
    this.createGridConnections();
}
```

### Area 4: SettingsModal (272 lines)

**Issue**: Directly dispatches action + calls callback

```javascript
handleApply() {
    // ⚠️ New architecture: dispatch directly
    this.store.dispatch(Actions.updateSettings(newSettings));
    
    // ⚠️ Legacy callback: for main.js integration
    if (this.onApply) {
        this.onApply(dimensions, gridSize);
    }
}
```

**Result**: Action dispatched twice (once here, once in callback's gameService.updateSettings())

### Area 5: ConnectionManager (180 lines)

**Issue**: Mutable state, no optimization

```javascript
export class ConnectionManager {
    constructor(scene) {
        this.scene = scene;
        this.connectionLines = [];  // Mutable array
    }
    
    createAllLines(connections) {
        connections.forEach(conn => {
            this.createLine(conn.posND1, conn.posND2);
        });
    }
    
    updateLines(rotations, cells = [], hoveredCell = null, previewCell = null) {
        // Iterates through ALL lines every frame
        this.connectionLines.forEach(line => {
            // Update each line's position/color
        });
    }
    
    // No batching, no optimization
    // No dirty flag tracking
    // No change detection
}
```

---

## 7. Root Causes of Bug Difficulty

### Root Cause 1: Distributed State with Manual Sync

**Symptom**: "Fix grid visual state not resetting on game reset"

```
User clicks Reset
  → GameState.moveHistory = []
  → StateStore notified
  → main.onStateChange()
    → ... but renderer.cells[i].marker still = true!
    → ... and cell.wireframe.material.color still = player color!
    → Visual state != Application state
```

**Fix Required**:
1. Call renderer.clearMarkers() in event listener
2. Which clears cell.marker, cell.isSelected
3. Which calls updateCellPositions() 
4. Which calls CellAppearanceManager.applyUnselectedAppearance()
5. Which recomputes color from W coordinate

This is 5 function calls in 1 to sync 1 piece of state!

### Root Cause 2: Tightly Coupled Layers

**Symptom**: Cannot test without entire infrastructure

```javascript
// To test main.js handleCellClick():
// Need: StateStore, EventBus, GameService
// Need: GridRenderer with actual THREE.Scene
// Need: DOM with canvas element
// Need: All event listeners wired up

// Result: Integration tests only, no unit tests
```

### Root Cause 3: Event Listener Ordering

**Symptom**: "Fix settings change order to properly clear markers"

```
If you call updateSettings() BEFORE resetGameState():
  1. Grid is recreated
  2. Then markers are cleared
  3. Result: Old markers briefly visible on new grid

If you call resetGameState() FIRST:
  1. Markers cleared
  2. moveHistory becomes empty
  3. Then grid recreated with empty state
  4. Result: Clean grid
```

No compile-time enforcement of this order.

### Root Cause 4: No Resource Management Pattern

**Symptom**: "Fix connection lines not being cleared on grid recreation"

Each manager has different cleanup:
- GridRenderer.cells: array.forEach + scene.remove()
- MarkerRenderer.markers: property clear
- ConnectionManager.connectionLines: manager.clear()
- CellAppearanceManager: stateless (no cleanup needed)

No unified pattern.

---

## 8. Architectural Debt Summary

| Issue | Severity | Frequency | Impact |
|-------|----------|-----------|--------|
| Distributed state (3 sources of truth) | CRITICAL | Every feature | Visual glitches, sync bugs |
| Monolithic main.js (465 lines) | HIGH | During maintenance | Hard to understand flow |
| Hard-coded dependencies | HIGH | During testing | Untestable code |
| Tight GridRenderer coupling | HIGH | During refactoring | Can't modify rendering |
| Event listener ordering | MEDIUM | During changes | Easy to introduce bugs |
| Global CONFIG mutation | MEDIUM | During settings | Hidden state, hard to debug |
| Manual resource cleanup | MEDIUM | During grid recreation | Resource leaks risk |
| No interface abstractions | MEDIUM | During extension | Can't swap implementations |
| Duplicate action dispatches | LOW | During UI integration | Performance waste |
| No batch operations | LOW | With large grids | Performance issues with 5D+ |

---

## 9. Recommended Architecture Improvements

### Phase 1: Eliminate Global CONFIG Mutation
- Create ConfigManager wrapper
- Make CONFIG immutable
- Pass settings through state only

### Phase 2: Unify State Management
- Move renderer.hoveredCell → StateStore.visual.hoveredCell
- Move renderer.previewCell → StateStore.visual.previewCell (already done)
- Create ViewModelStore for computed values

### Phase 3: Extract Renderer Abstraction
- Define IRenderer interface
- Separate THREE.js implementation
- Allow mock renderer for testing

### Phase 4: Split main.js Responsibilities
- GameOrchestrator: initialization
- GameStateSync: state management
- GameInputHandler: input events
- GameUISync: UI updates
- Each ≤ 150 lines

### Phase 5: Batch Grid Operations
- Grid.createBatch(), Grid.removeBatch()
- ConnectionManager.updateBatch()
- Reduce from 256 operations to 1

---

## Conclusion

The codebase is at an inflection point: the new architecture (Phases 1-3) is solid, but legacy components (GridRenderer, main.js, MarkerRenderer) create friction. Most bugs stem from:

1. **State synchronization**: Manual syncing between StateStore and Renderer
2. **Coupling**: Hard-coded dependencies prevent testing and refactoring
3. **Complexity**: Too many concerns in few files (main.js, GridRenderer)
4. **Fragility**: Event listener ordering requirements and resource cleanup

The existing test suite (2,954 lines) validates domain and infrastructure layers well. To reduce bug fix time significantly, complete Phase 4-5 to eliminate manual synchronization and decouple presentation from infrastructure.

