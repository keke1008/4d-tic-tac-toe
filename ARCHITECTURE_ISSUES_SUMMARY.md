# 4D Tic-Tac-Toe: Architecture Issues Summary

## Root Causes of Bug Difficulty (Ranked by Impact)

### 1. **DISTRIBUTED STATE (3 SOURCES OF TRUTH)** ⭐ CRITICAL
- **StateStore**: `state.settings.dimensions`, `state.game.moveHistory`
- **Renderer**: `renderer.hoveredCell`, `cell.marker`, `cell.wireframe.material.color`
- **Global**: `CONFIG.DIMENSIONS`, `CONFIG.GRID_SIZE`

**Impact**: Visual state ≠ Application state → 6+ recent bugs (fixes: 35bedd9, 934c4ee, 5da88f7, b58a435)

**Example**: User resets game
```
GameState.moveHistory = [] ✓
But renderer.cells[i].marker still = true ✗
And cell.wireframe.material.color still = player color ✗
```

**Fix Required**: 5 function calls just to sync 1 piece of state
```
renderer.clearMarkers()
  → markerRenderer.clearAllMarkers()
    → cell.marker = false
  → renderer.updateCellPositions()
    → CellAppearanceManager.applyUnselectedAppearance()
```

---

### 2. **MONOLITHIC COMPONENTS (main.js: 465 lines, GridRenderer: 432 lines)**
- **main.js responsibilities**: Orchestration (1), Event setup (9 event types), State sync (4 fields), Animation, Input handling, Settings changes
- **GridRenderer responsibilities**: Scene init, Grid creation, Hover detection, Raycasting, Cell updates, Camera delegation, Marker management, Preview management, Grid recreation, Resource disposal

**Impact**: Hard to understand, modify, or test (no unit tests for either)

---

### 3. **TIGHTLY COUPLED DEPENDENCIES (NO DEPENDENCY INJECTION)**
```
main.js
  └─ GridRenderer (hard-coded new)
      └─ SceneManager (hard-coded new)
          └─ THREE.js objects (hard-coded)
```

**Impact**: Cannot test without DOM, cannot mock, cannot swap implementations

**Test Gap**: 
- Domain/Infrastructure: 95% covered ✓
- Application: 75% covered ⚠️
- Presentation/Rendering: 0% covered ❌

---

### 4. **EVENT LISTENER ORDERING DEPENDENCY (FRAGILE)**
File: `main.js`, lines 350-390

```javascript
// MUST call in this order or markers appear on new grid!
this.gameService.resetGameState();  // First
this.gameService.updateSettings();  // Then
```

**Why Fragile**: No compile-time enforcement, requires understanding entire event flow

---

### 5. **GLOBAL CONFIG MUTATION (HIDDEN STATE)**
File: `config.js`

```javascript
CONFIG.DIMENSIONS = newDimensions;  // Mutated at runtime!
CONFIG.GRID_SIZE = newGridSize;      // StateStore has different value!
```

**Impact**: Hidden dependency, hard to debug, config state != app state

---

### 6. **DUPLICATE ACTION DISPATCHES (PERFORMANCE)**
File: `presentation/ui/SettingsModal.js` → `main.js` → `GameService.js`

```
SettingsModal dispatches updateSettings #1
  ↓
Callback calls gameService.updateSettings()
  ↓
Which dispatches updateSettings #2 (DUPLICATE!)

Result: 
- GameState.initial() called 3 times
- updateStatus() called 4 times
- Heavy THREE.js operations twice
```

---

### 7. **NO RESOURCE MANAGEMENT PATTERN (LEAKS RISK)**
Each manager cleans up differently:
- GridRenderer: `cells.forEach(cell => scene.remove(cell.group))`
- MarkerRenderer: `cell.marker = false`
- ConnectionManager: `this.connectionManager.clear()` (easy to forget!)
- CellAppearanceManager: stateless (no cleanup)

**Impact**: Must remember each cleanup step or get resource leaks

---

### 8. **HEAVY OPERATIONS IN EVENT LISTENERS (BATCH ISSUE)**
File: `renderer.js`, `recreateGrid()` (lines 399-431)

For 4D grid size 4:
- 256 cells = 256 `scene.remove()` calls
- 96 connections = 96 individual line removals
- No batching, no optimization

**Impact**: Grid changes slow, especially for 5D+ grids

---

## Key Files with Issues

| File | Lines | Issues | Impact |
|------|-------|--------|--------|
| main.js | 465 | 7 concerns, 40+ event listeners, no tests | Hard to maintain, untestable |
| GridRenderer | 432 | 11 responsibilities, no DI, no tests | Can't test rendering |
| renderer.js | 432 | Legacy monolith, manual sync | Part of coupling chain |
| SettingsModal.js | 272 | Dual dispatch (new + legacy), 2 APIs | Duplicate actions |
| reducers.js | 286 | Multiple initialization paths | Complexity |
| ConnectionManager | 180 | No batching, mutable state | Performance, resource issues |
| MarkerRenderer | 94 | No unified cleanup pattern | Resource leaks risk |

---

## Bug Pattern Examples

### Pattern 1: Visual State Out of Sync
```
Commit 934c4ee: Fix grid visual state not resetting on game reset
Commit 35bedd9: Fix grid markers not clearing on game reset
```

### Pattern 2: Resource Not Cleaned
```
Commit 5da88f7: Fix connection lines not being cleared on grid recreation
```

### Pattern 3: Event Ordering
```
Commit b58a435: Fix settings change order to properly clear markers
```

### Pattern 4: Infinite Recursion (Freeze)
```
Commit 59ed503: Fix actual freeze cause: infinite recursion via game:reset event
Commit a20b5a9: Fix settings change freeze caused by duplicate updates
```

All these bugs stem from the 8 architectural issues above.

---

## What's Working Well ✓

- **Infrastructure Layer** (StateStore, EventBus, ConfigManager) - Clean, testable, well-documented
- **Domain Layer** (GameState, GameRules, WinChecker) - Pure functions, 90% test coverage
- **Application Layer** (GameService) - Clear use cases, 75% test coverage
- **Test Suite** (2,954 lines) - Good foundation for lower layers

---

## Completion Status of Refactoring

| Phase | Scope | Status | Issues |
|-------|-------|--------|--------|
| Phase 1 | Infrastructure | ✓ Complete | None, working well |
| Phase 2 | Domain | ✓ Complete | None, working well |
| Phase 3 | Application | ✓ Complete | Duplicate actions only |
| Phase 4 | Presentation (Partial) | ⚠️ Partial | SettingsModal has dual dispatch |
| Phase 5+ | Legacy Refactoring | ❌ Not started | GridRenderer, main.js, renderer.js untouched |

---

## To Fix Most Bugs, Complete:

1. **Eliminate distributed state** → Single StateStore for all state
2. **Complete Phase 4** → Decouple presentation from infrastructure
3. **Split main.js** → <150 lines each (5 classes)
4. **Extract Renderer interface** → Allow mock renderer for tests
5. **Batch grid operations** → One operation instead of 256

