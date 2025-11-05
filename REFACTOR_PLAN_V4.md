# 抜本的リファクタリング実装計画 v4.0

**プロジェクト**: N次元三目並べ（N-Dimensional Tic-Tac-Toe）
**作成日**: 2025-11-05
**対象バージョン**: 3.3.1 → 4.0.0
**計画期間**: 17週間（4ヶ月）

---

## 📋 目次

1. [概要](#-概要)
2. [現状と目標](#-現状と目標)
3. [Phase 1: インフラ層構築](#-phase-1-インフラ層構築)
4. [Phase 2: ドメイン層移行](#-phase-2-ドメイン層移行)
5. [Phase 3: アプリケーション層構築](#-phase-3-アプリケーション層構築)
6. [Phase 4: プレゼンテーション層リファクタリング](#-phase-4-プレゼンテーション層リファクタリング)
7. [Phase 5: main.jsリファクタリング](#-phase-5-mainjs-リファクタリング)
8. [Phase 6-10: 残りのフェーズ](#-phase-6-10-残りのフェーズ)
9. [移行戦略とリスク管理](#-移行戦略とリスク管理)
10. [品質保証計画](#-品質保証計画)

---

## 🎯 概要

### リファクタリングの目的
現在のv3.3.1は優れた基盤を持つが、以下の課題があります：
- テスタビリティの欠如（カバレッジ0%）
- 状態管理の分散
- レイヤー境界の曖昧さ
- 依存の固定化

v4.0.0では、**レイヤードアーキテクチャ**、**依存性注入**、**不変状態管理**を導入し、保守性、拡張性、テスタビリティを劇的に向上させます。

### アプローチ
- **段階的移行**: 一度にすべてを変更しない
- **並行実装**: 新旧コードを共存させる
- **テストファースト**: すべての新コードをテストでカバー
- **継続的デプロイ**: 各フェーズ後に動作確認

---

## 📊 現状と目標

### 現状（v3.3.1）

| 指標 | 現状 |
|------|------|
| テストカバレッジ | 0% |
| 総LOC | ~2,500 |
| ファイル数 | 20 |
| 循環的複雑度 | 平均 6-8 |
| 型安全性 | JSDocのみ |
| 状態管理 | 分散（3箇所） |
| 新機能追加時間 | 4-8時間 |

### 目標（v4.0.0）

| 指標 | 目標 |
|------|------|
| テストカバレッジ | 80%+ |
| 総LOC | ~3,500（テスト含む） |
| ファイル数 | ~35（レイヤー分離） |
| 循環的複雑度 | 平均 < 5 |
| 型安全性 | TypeScript（Phase 9） |
| 状態管理 | 単一Store |
| 新機能追加時間 | 2-4時間（50%削減） |

---

## 🔧 Phase 1: インフラ層構築

**期間**: Week 1-2（2週間）
**優先度**: 最高 🔴
**リスク**: 低

### 目的
アプリケーションの基盤となる状態管理、イベントシステム、設定管理を構築します。

### タスク詳細

#### 1.1 StateStore実装（Week 1, Day 1-3）

**ファイル**: `js/infrastructure/state/StateStore.js`

```javascript
/**
 * Redux-inspired centralized state management
 */
export class StateStore {
    constructor(initialState, rootReducer, middleware = []) {
        this._state = initialState;
        this._reducer = rootReducer;
        this._middleware = middleware;
        this._listeners = new Set();
        this._isDispatching = false;
    }

    getState() {
        return this._state;
    }

    dispatch(action) {
        if (this._isDispatching) {
            throw new Error('Cannot dispatch while reducing');
        }

        try {
            this._isDispatching = true;

            // Middleware chain
            let finalAction = action;
            for (const mw of this._middleware) {
                finalAction = mw(this)(finalAction);
            }

            // Reduce
            const prevState = this._state;
            this._state = this._reducer(prevState, finalAction);

            // Notify
            this._notifyListeners(prevState, this._state, finalAction);

        } finally {
            this._isDispatching = false;
        }
    }

    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    _notifyListeners(prevState, nextState, action) {
        for (const listener of this._listeners) {
            listener(nextState, prevState, action);
        }
    }
}
```

**テスト**: `tests/infrastructure/StateStore.test.js`
```javascript
describe('StateStore', () => {
    it('should initialize with initial state', () => {
        const store = new StateStore({ count: 0 }, (s) => s);
        expect(store.getState()).toEqual({ count: 0 });
    });

    it('should update state via reducer', () => {
        const reducer = (state, action) => {
            if (action.type === 'INCREMENT') {
                return { count: state.count + 1 };
            }
            return state;
        };
        const store = new StateStore({ count: 0 }, reducer);
        store.dispatch({ type: 'INCREMENT' });
        expect(store.getState().count).toBe(1);
    });

    it('should notify listeners on state change', () => {
        const reducer = (state, action) => ({ ...state });
        const store = new StateStore({ count: 0 }, reducer);

        let notified = false;
        store.subscribe(() => { notified = true; });
        store.dispatch({ type: 'TEST' });

        expect(notified).toBe(true);
    });

    it('should prevent dispatch during reduction', () => {
        const reducer = (state, action) => {
            store.dispatch({ type: 'NESTED' }); // ❌ Should throw
            return state;
        };
        const store = new StateStore({ count: 0 }, reducer);

        expect(() => store.dispatch({ type: 'TEST' })).toThrow();
    });
});
```

**目標カバレッジ**: 95%+

#### 1.2 Actions & Reducers定義（Week 1, Day 4-5）

**ファイル**: `js/infrastructure/state/actions.js`
```javascript
export const ActionTypes = {
    // Game actions
    PLACE_MARKER: 'PLACE_MARKER',
    RESET_GAME: 'RESET_GAME',
    SWITCH_PLAYER: 'SWITCH_PLAYER',
    SET_WINNER: 'SET_WINNER',

    // Visual actions
    UPDATE_ROTATION: 'UPDATE_ROTATION',
    SET_CAMERA_POSITION: 'SET_CAMERA_POSITION',
    SET_HOVERED_CELL: 'SET_HOVERED_CELL',
    SET_PREVIEW_CELL: 'SET_PREVIEW_CELL',
    TOGGLE_AUTO_ROTATE: 'TOGGLE_AUTO_ROTATE',

    // Settings actions
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',

    // UI actions
    TOGGLE_SETTINGS_MODAL: 'TOGGLE_SETTINGS_MODAL',
    UPDATE_STATUS: 'UPDATE_STATUS',
};

export const Actions = {
    placeMarker: (position, player) => ({
        type: ActionTypes.PLACE_MARKER,
        payload: { position, player }
    }),

    resetGame: (settings) => ({
        type: ActionTypes.RESET_GAME,
        payload: { settings }
    }),

    updateRotation: (axis, delta) => ({
        type: ActionTypes.UPDATE_ROTATION,
        payload: { axis, delta }
    }),

    // ... more action creators
};
```

**ファイル**: `js/infrastructure/state/reducers.js`
```javascript
import { ActionTypes } from './actions.js';

// Initial state
export const initialState = {
    game: {
        board: null,
        currentPlayer: 'X',
        gamePhase: 'playing',
        winner: null,
        moveHistory: [],
    },
    settings: {
        dimensions: 4,
        gridSize: 4,
    },
    visual: {
        rotation: {},
        cameraDistance: 12,
        hoveredCell: null,
        previewCell: null,
        autoRotate: true,
    },
    ui: {
        settingsModalOpen: false,
        status: '',
    }
};

// Root reducer
export function rootReducer(state = initialState, action) {
    return {
        game: gameReducer(state.game, action),
        settings: settingsReducer(state.settings, action),
        visual: visualReducer(state.visual, action),
        ui: uiReducer(state.ui, action),
    };
}

// Domain reducers
function gameReducer(state, action) {
    switch (action.type) {
        case ActionTypes.PLACE_MARKER:
            // Placeholder - will be replaced in Phase 2
            return state;

        case ActionTypes.RESET_GAME:
            return {
                ...initialState.game,
            };

        default:
            return state;
    }
}

function visualReducer(state, action) {
    switch (action.type) {
        case ActionTypes.UPDATE_ROTATION:
            const { axis, delta } = action.payload;
            return {
                ...state,
                rotation: {
                    ...state.rotation,
                    [axis]: (state.rotation[axis] || 0) + delta
                }
            };

        case ActionTypes.TOGGLE_AUTO_ROTATE:
            return {
                ...state,
                autoRotate: !state.autoRotate
            };

        default:
            return state;
    }
}

// ... more reducers
```

**テスト**: 各reducerのユニットテスト

#### 1.3 EventBus実装（Week 2, Day 1-2）

**ファイル**: `js/infrastructure/events/EventBus.js`
```javascript
/**
 * Centralized event bus for cross-component communication
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(eventType, handler) {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, new Set());
        }
        this._listeners.get(eventType).add(handler);

        return () => this.off(eventType, handler);
    }

    off(eventType, handler) {
        const handlers = this._listeners.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    emit(eventType, data) {
        const handlers = this._listeners.get(eventType);
        if (!handlers) return;

        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventType}:`, error);
            }
        }
    }

    once(eventType, handler) {
        const wrapper = (data) => {
            handler(data);
            this.off(eventType, wrapper);
        };
        this.on(eventType, wrapper);
    }

    clear(eventType) {
        if (eventType) {
            this._listeners.delete(eventType);
        } else {
            this._listeners.clear();
        }
    }
}
```

#### 1.4 ConfigManager実装（Week 2, Day 3-5）

**ファイル**: `js/infrastructure/config/ConfigManager.js`
```javascript
import { EventBus } from '../events/EventBus.js';

/**
 * Managed configuration with validation
 */
export class ConfigManager {
    constructor(initialConfig, validators = {}) {
        this._config = { ...initialConfig };
        this._validators = validators;
        this._eventBus = new EventBus();
        this._locked = false;
    }

    get(key) {
        return this._config[key];
    }

    getAll() {
        return { ...this._config };
    }

    set(key, value) {
        if (this._locked) {
            throw new Error('Config is locked');
        }

        // Validate
        if (this._validators[key]) {
            const error = this._validators[key](value);
            if (error) {
                throw new Error(`Invalid config value for ${key}: ${error}`);
            }
        }

        const oldValue = this._config[key];
        this._config[key] = value;

        // Emit change event
        this._eventBus.emit('configChanged', {
            key,
            oldValue,
            newValue: value
        });

        return this;
    }

    setAll(newConfig) {
        for (const [key, value] of Object.entries(newConfig)) {
            this.set(key, value);
        }
        return this;
    }

    onChange(handler) {
        return this._eventBus.on('configChanged', handler);
    }

    lock() {
        this._locked = true;
    }

    unlock() {
        this._locked = false;
    }
}

// Validators
export const configValidators = {
    DIMENSIONS: (value) => {
        if (value < 2 || value > 8) {
            return 'Dimensions must be between 2 and 8';
        }
        return null;
    },

    GRID_SIZE: (value) => {
        if (value < 2 || value > 6) {
            return 'Grid size must be between 2 and 6';
        }
        return null;
    },
};
```

### 成果物

| ファイル | LOC | テスト | カバレッジ |
|---------|-----|--------|-----------|
| StateStore.js | 80 | ✅ | 95% |
| actions.js | 60 | ✅ | 100% |
| reducers.js | 120 | ✅ | 90% |
| EventBus.js | 60 | ✅ | 95% |
| ConfigManager.js | 100 | ✅ | 90% |
| **合計** | **420** | **5ファイル** | **94%** |

### マイルストーン
- ✅ StateStoreが動作
- ✅ Actions/Reducersが定義済み
- ✅ EventBusが動作
- ✅ ConfigManagerが設定を管理
- ✅ すべてのユニットテストがパス

---

## 🎲 Phase 2: ドメイン層移行

**期間**: Week 3-4（2週間）
**優先度**: 最高 🔴
**リスク**: 低

### 目的
ビジネスロジックを純粋関数として抽出し、完全にテスト可能にします。

### タスク詳細

#### 2.1 GameState実装（Week 3, Day 1-3）

**ファイル**: `js/domain/state/GameState.js`
```javascript
/**
 * Immutable game state
 * All methods return new instances
 */
export class GameState {
    constructor(data = {}) {
        this.board = data.board || null;
        this.currentPlayer = data.currentPlayer || 'X';
        this.gamePhase = data.gamePhase || 'playing';
        this.winner = data.winner || null;
        this.moveHistory = data.moveHistory || [];
        this.settings = data.settings || null;

        Object.freeze(this);
    }

    static initial(settings) {
        return new GameState({
            board: BoardState.empty(settings.dimensions, settings.gridSize),
            settings: settings
        });
    }

    // Immutable update methods
    withMarker(position, player) {
        return new GameState({
            ...this,
            board: this.board.set(position, player),
            moveHistory: [...this.moveHistory, { position, player, timestamp: Date.now() }]
        });
    }

    withPlayer(player) {
        return new GameState({ ...this, currentPlayer: player });
    }

    withWinner(winner) {
        return new GameState({
            ...this,
            gamePhase: 'won',
            winner: winner
        });
    }

    withDraw() {
        return new GameState({
            ...this,
            gamePhase: 'draw'
        });
    }

    // Query methods
    getMarkerAt(position) {
        return this.board.get(position);
    }

    isValidMove(position) {
        return this.gamePhase === 'playing' &&
               this.board.isEmpty(position);
    }

    isBoardFull() {
        return this.board.isFull();
    }

    isGameOver() {
        return this.gamePhase !== 'playing';
    }
}
```

**テスト**: 完全なImmutability検証

#### 2.2 BoardState実装（Week 3, Day 4-5）

**ファイル**: `js/domain/state/BoardState.js`
```javascript
/**
 * Immutable board state
 * Handles both Array and Map storage strategies
 */
export class BoardState {
    constructor(dimensions, gridSize, storage) {
        this.dimensions = dimensions;
        this.gridSize = gridSize;
        this._storage = storage;

        Object.freeze(this);
    }

    static empty(dimensions, gridSize) {
        const storage = dimensions >= 5
            ? new Map()
            : createNestedArray(dimensions, gridSize);

        return new BoardState(dimensions, gridSize, storage);
    }

    get(position) {
        if (this._storage instanceof Map) {
            return this._storage.get(position.join(',')) || null;
        }

        let current = this._storage;
        for (let i = position.length - 1; i >= 0; i--) {
            current = current[position[i]];
            if (current === undefined) return null;
        }
        return current;
    }

    set(position, value) {
        if (this._storage instanceof Map) {
            const newStorage = new Map(this._storage);
            newStorage.set(position.join(','), value);
            return new BoardState(this.dimensions, this.gridSize, newStorage);
        }

        const newStorage = deepCloneArray(this._storage);
        let current = newStorage;
        for (let i = position.length - 1; i > 0; i--) {
            current = current[position[i]];
        }
        current[position[0]] = value;

        return new BoardState(this.dimensions, this.gridSize, newStorage);
    }

    isEmpty(position) {
        return this.get(position) === null;
    }

    isFull() {
        const totalCells = Math.pow(this.gridSize, this.dimensions);
        if (this._storage instanceof Map) {
            return this._storage.size === totalCells;
        }
        return countFilledCells(this._storage, this.dimensions) === totalCells;
    }
}

function createNestedArray(dims, size) {
    if (dims === 1) return new Array(size).fill(null);
    return Array.from({ length: size }, () => createNestedArray(dims - 1, size));
}

function deepCloneArray(arr) {
    return arr.map(item => Array.isArray(item) ? deepCloneArray(item) : item);
}

function countFilledCells(arr, depth) {
    if (depth === 1) {
        return arr.filter(cell => cell !== null).length;
    }
    return arr.reduce((sum, sub) => sum + countFilledCells(sub, depth - 1), 0);
}
```

#### 2.3 GameRules実装（Week 4, Day 1-3）

**ファイル**: `js/domain/rules/GameRules.js`
```javascript
import { WinChecker } from './WinChecker.js';

/**
 * Pure game logic functions
 * No side effects, fully testable
 */
export class GameRules {
    /**
     * Attempt to place marker
     * @returns {GameState} New state (unchanged if invalid)
     */
    static placeMarker(state, position, player = null) {
        const actualPlayer = player || state.currentPlayer;

        if (!state.isValidMove(position)) {
            return state;
        }

        // Place marker
        let newState = state.withMarker(position, actualPlayer);

        // Check win
        if (this.checkWin(newState, position)) {
            return newState.withWinner(actualPlayer);
        }

        // Check draw
        if (newState.isBoardFull()) {
            return newState.withDraw();
        }

        // Switch player
        return newState.withPlayer(this.nextPlayer(actualPlayer));
    }

    static checkWin(state, position) {
        const player = state.getMarkerAt(position);
        if (!player) return false;

        return WinChecker.hasWinningLine(
            state.board,
            position,
            player,
            state.settings
        );
    }

    static nextPlayer(current) {
        return current === 'X' ? 'O' : 'X';
    }

    static reset(state) {
        return GameState.initial(state.settings);
    }

    static updateSettings(state, newSettings) {
        return GameState.initial(newSettings);
    }

    static canUndo(state) {
        return state.moveHistory.length > 0;
    }

    static undo(state) {
        if (!this.canUndo(state)) return state;

        // Rebuild state from history
        const newHistory = state.moveHistory.slice(0, -1);
        let newState = GameState.initial(state.settings);

        for (const move of newHistory) {
            newState = newState.withMarker(move.position, move.player);
            newState = newState.withPlayer(this.nextPlayer(move.player));
        }

        // Restore moveHistory
        return new GameState({ ...newState, moveHistory: newHistory });
    }
}
```

**テスト**: すべてのゲームルールをテスト
```javascript
describe('GameRules', () => {
    describe('placeMarker', () => {
        it('should place marker and switch player', () => {
            const state = GameState.initial({ dimensions: 2, gridSize: 3 });
            const newState = GameRules.placeMarker(state, [0, 0]);

            expect(newState.getMarkerAt([0, 0])).toBe('X');
            expect(newState.currentPlayer).toBe('O');
            expect(newState.moveHistory).toHaveLength(1);
        });

        it('should not modify state on invalid move', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });
            state = GameRules.placeMarker(state, [0, 0]); // X
            const newState = GameRules.placeMarker(state, [0, 0]); // O tries same cell

            expect(newState).toBe(state); // Same reference = unchanged
        });

        it('should detect win in 2D', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });
            state = GameRules.placeMarker(state, [0, 0]); // X
            state = GameRules.placeMarker(state, [1, 0]); // O
            state = GameRules.placeMarker(state, [0, 1]); // X
            state = GameRules.placeMarker(state, [1, 1]); // O
            state = GameRules.placeMarker(state, [0, 2]); // X wins

            expect(state.gamePhase).toBe('won');
            expect(state.winner).toBe('X');
        });

        it('should detect draw', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 2 });
            state = GameRules.placeMarker(state, [0, 0]); // X
            state = GameRules.placeMarker(state, [0, 1]); // O
            state = GameRules.placeMarker(state, [1, 1]); // X
            state = GameRules.placeMarker(state, [1, 0]); // O - draw

            expect(state.gamePhase).toBe('draw');
        });
    });

    describe('undo', () => {
        it('should undo last move', () => {
            let state = GameState.initial({ dimensions: 2, gridSize: 3 });
            state = GameRules.placeMarker(state, [0, 0]); // X
            state = GameRules.placeMarker(state, [1, 0]); // O

            const undoState = GameRules.undo(state);

            expect(undoState.getMarkerAt([0, 0])).toBe('X');
            expect(undoState.getMarkerAt([1, 0])).toBe(null);
            expect(undoState.currentPlayer).toBe('O');
        });
    });
});
```

#### 2.4 WinChecker移行（Week 4, Day 4-5）

既存のWinCheckerを純粋関数に変換：

```javascript
export class WinChecker {
    static hasWinningLine(board, position, player, settings) {
        const directions = this.generateDirections(settings.dimensions);

        for (const dir of directions) {
            if (this.checkDirection(board, position, player, dir, settings.gridSize)) {
                return true;
            }
        }

        return false;
    }

    static checkDirection(board, start, player, direction, gridSize) {
        let count = 1; // Start position

        // Check positive direction
        count += this.countInDirection(board, start, player, direction, gridSize, 1);

        // Check negative direction
        count += this.countInDirection(board, start, player, direction, gridSize, -1);

        return count >= gridSize;
    }

    // ... rest of pure functions
}
```

### 成果物

| ファイル | LOC | テスト | カバレッジ |
|---------|-----|--------|-----------|
| GameState.js | 100 | ✅ | 100% |
| BoardState.js | 150 | ✅ | 95% |
| GameRules.js | 120 | ✅ | 98% |
| WinChecker.js | 150 | ✅ | 95% |
| **合計** | **520** | **4ファイル** | **97%** |

### Integration Point
Phase 1のreducerを更新してGameRulesを使用：

```javascript
function gameReducer(state, action) {
    switch (action.type) {
        case ActionTypes.PLACE_MARKER:
            const gameState = GameState.fromStore(state);
            const newGameState = GameRules.placeMarker(
                gameState,
                action.payload.position,
                action.payload.player
            );
            return newGameState.toStore();

        // ... other cases
    }
}
```

---

## 🎮 Phase 3: アプリケーション層構築

**期間**: Week 5-6（2週間）
**優先度**: 高 🟠
**リスク**: 中

### 目的
ユースケースを実装し、プレゼンテーション層とドメイン層を橋渡しします。

### タスク詳細

#### 3.1 GameService実装（Week 5, Day 1-3）

**ファイル**: `js/application/services/GameService.js`
```javascript
/**
 * Main application service
 * Coordinates game flow
 */
export class GameService {
    constructor(stateStore, eventBus) {
        this.store = stateStore;
        this.eventBus = eventBus;
    }

    // User actions
    handleCellClick(position) {
        const state = this.store.getState();

        // Check if preview or confirm
        if (state.visual.previewCell === position) {
            // Confirm placement
            this.store.dispatch(Actions.placeMarker(position));
            this.store.dispatch(Actions.setPreviewCell(null));
        } else {
            // Set preview
            this.store.dispatch(Actions.setPreviewCell(position));
        }
    }

    resetGame(newSettings = null) {
        const settings = newSettings || this.store.getState().settings;
        this.store.dispatch(Actions.resetGame(settings));
    }

    updateSettings(newSettings) {
        this.store.dispatch(Actions.updateSettings(newSettings));
    }

    undo() {
        this.store.dispatch(Actions.undo());
    }

    redo() {
        this.store.dispatch(Actions.redo());
    }

    // Queries
    getCurrentPlayer() {
        return this.store.getState().game.currentPlayer;
    }

    getGamePhase() {
        return this.store.getState().game.gamePhase;
    }

    getWinner() {
        return this.store.getState().game.winner;
    }

    canUndo() {
        return this.store.getState().game.moveHistory.length > 0;
    }

    canRedo() {
        // TODO: Implement redo stack
        return false;
    }
}
```

#### 3.2 CommandHandler実装（Week 5, Day 4-5）

**ファイル**: `js/application/commands/CommandHandler.js`
```javascript
/**
 * Command pattern for undo/redo
 */
export class CommandHandler {
    constructor(stateStore) {
        this.store = stateStore;
        this.history = [];
        this.historyIndex = -1;
    }

    execute(command) {
        const currentState = this.store.getState().game;
        const newState = command.execute(currentState);

        this.store.dispatch({
            type: 'GAME_STATE_UPDATED',
            payload: newState
        });

        // Truncate redo branch
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(command);
        this.historyIndex++;
    }

    undo() {
        if (!this.canUndo()) return;

        const command = this.history[this.historyIndex];
        const currentState = this.store.getState().game;
        const newState = command.undo(currentState);

        this.store.dispatch({
            type: 'GAME_STATE_UPDATED',
            payload: newState
        });

        this.historyIndex--;
    }

    redo() {
        if (!this.canRedo()) return;

        this.historyIndex++;
        const command = this.history[this.historyIndex];
        const currentState = this.store.getState().game;
        const newState = command.execute(currentState);

        this.store.dispatch({
            type: 'GAME_STATE_UPDATED',
            payload: newState
        });
    }

    canUndo() {
        return this.historyIndex >= 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    clear() {
        this.history = [];
        this.historyIndex = -1;
    }
}
```

#### 3.3 Command実装（Week 6）

**ファイル**: `js/application/commands/PlaceMarkerCommand.js`
```javascript
export class PlaceMarkerCommand {
    constructor(position, player) {
        this.position = position;
        this.player = player;
    }

    execute(gameState) {
        return GameRules.placeMarker(gameState, this.position, this.player);
    }

    undo(gameState) {
        return GameRules.undo(gameState);
    }
}
```

**ファイル**: `js/application/commands/ResetGameCommand.js`
```javascript
export class ResetGameCommand {
    constructor(settings) {
        this.settings = settings;
        this.previousState = null;
    }

    execute(gameState) {
        this.previousState = gameState;
        return GameRules.reset(gameState);
    }

    undo(gameState) {
        return this.previousState;
    }
}
```

### 統合テスト

```javascript
// tests/integration/GameService.test.js
describe('GameService Integration', () => {
    let service;
    let store;

    beforeEach(() => {
        store = new StateStore(initialState, rootReducer);
        service = new GameService(store);
    });

    it('should handle complete game flow', () => {
        // Preview cell
        service.handleCellClick([0, 0]);
        expect(store.getState().visual.previewCell).toEqual([0, 0]);

        // Confirm placement
        service.handleCellClick([0, 0]);
        expect(store.getState().game.board.get([0, 0])).toBe('X');
        expect(service.getCurrentPlayer()).toBe('O');
    });

    it('should support undo/redo', () => {
        service.handleCellClick([0, 0]);
        service.handleCellClick([0, 0]); // Place X

        service.undo();
        expect(store.getState().game.board.get([0, 0])).toBe(null);

        service.redo();
        expect(store.getState().game.board.get([0, 0])).toBe('X');
    });
});
```

---

## 🎨 Phase 4: プレゼンテーション層リファクタリング

**期間**: Week 7-8（2週間）
**優先度**: 高 🟠
**リスク**: 高（Three.js統合）

### 目的
レンダリングと入力処理を新アーキテクチャに適合させます。

### タスク詳細

#### 4.1 SceneRenderer（Week 7）

既存のGridRendererを分離：

```javascript
// js/presentation/rendering/SceneRenderer.js
export class SceneRenderer {
    constructor(container, stateStore) {
        this.container = container;
        this.store = stateStore;

        // Subcomponents (DI)
        this.sceneManager = new SceneManager(container);
        this.cameraController = new CameraController();
        this.cellRenderer = new CellRenderer();
        this.markerRenderer = new MarkerRenderer();

        // Subscribe to state
        this.unsubscribe = this.store.subscribe((newState, prevState) => {
            this.onStateChange(newState, prevState);
        });
    }

    onStateChange(newState, prevState) {
        // Update only what changed
        if (newState.visual.rotation !== prevState.visual.rotation) {
            this.updateCellPositions(newState.visual.rotation);
        }

        if (newState.game.board !== prevState.game.board) {
            this.updateMarkers(newState.game.board);
        }
    }

    render() {
        this.sceneManager.render();
    }

    dispose() {
        this.unsubscribe();
        this.sceneManager.dispose();
    }
}
```

#### 4.2 InputMapper（Week 8）

入力をコマンドに変換：

```javascript
// js/presentation/input/InputMapper.js
export class InputMapper {
    constructor(canvas, gameService) {
        this.canvas = canvas;
        this.gameService = gameService;

        this.mouseHandler = new MouseInputHandler(canvas);
        this.touchHandler = new TouchInputHandler(canvas);

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.mouseHandler.on('cellClick', (position) => {
            this.gameService.handleCellClick(position);
        });

        this.mouseHandler.on('drag', (delta) => {
            // Dispatch rotation action
            this.gameService.store.dispatch(
                Actions.updateRotation('xw', delta.x)
            );
        });
    }
}
```

---

## 📝 Phase 5: main.jsリファクタリング

**期間**: Week 9
**優先度**: 中 🟡
**リスク**: 中

### DIコンテナ導入

```javascript
// js/infrastructure/di/Container.js
export class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    register(name, factory, singleton = false) {
        this.services.set(name, { factory, singleton });
    }

    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`Service ${name} not registered`);
        }

        const { factory, singleton } = this.services.get(name);

        if (singleton) {
            if (!this.singletons.has(name)) {
                this.singletons.set(name, factory(this));
            }
            return this.singletons.get(name);
        }

        return factory(this);
    }
}

// js/main.js
import { DIContainer } from './infrastructure/di/Container.js';

// Setup DI container
const container = new DIContainer();

// Register services
container.register('stateStore', () => {
    return new StateStore(initialState, rootReducer);
}, true); // Singleton

container.register('eventBus', () => new EventBus(), true);

container.register('gameService', (c) => {
    return new GameService(
        c.get('stateStore'),
        c.get('eventBus')
    );
}, true);

container.register('sceneRenderer', (c) => {
    return new SceneRenderer(
        document.getElementById('canvas-container'),
        c.get('stateStore')
    );
}, true);

// Bootstrap app
class App {
    constructor(container) {
        this.gameService = container.get('gameService');
        this.renderer = container.get('sceneRenderer');
        this.inputMapper = new InputMapper(
            this.renderer.getCanvas(),
            this.gameService
        );

        this.start();
    }

    start() {
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render();
    }
}

// Initialize
const app = new App(container);
```

---

## 🚀 Phase 6-10: 残りのフェーズ

### Phase 6: E2Eテスト（Week 10）
- Playwright導入
- 主要シナリオのE2Eテスト
- CI/CD統合

### Phase 7: パフォーマンス最適化（Week 11）
- Dirty flag pattern
- レンダリング最適化
- メモ化戦略

### Phase 8: 高度な機能（Week 12-13）
- Undo/Redo UI
- Move history表示
- Replay機能

### Phase 9: TypeScript移行（Week 14-16、オプション）
- TypeScript環境構築
- 型定義追加
- ビルドパイプライン

### Phase 10: ドキュメント（Week 17）
- APIドキュメント生成
- 開発者ガイド
- アーキテクチャ図

---

## 🛡️ 移行戦略とリスク管理

### 並行実装戦略

```
v3.3.1 (stable)
    ↓
    ├─ infrastructure/ (Phase 1) ← 新規追加、既存コード無影響
    ├─ domain/ (Phase 2) ← 新規追加、既存コード無影響
    ├─ application/ (Phase 3) ← 新規追加、既存コード無影響
    ↓
v3.9.0 (hybrid) ← 新旧コード共存
    ↓
    ├─ presentation/ (Phase 4) ← 既存コード置換開始
    ├─ main.js (Phase 5) ← 既存コード置換
    ↓
v4.0.0 (new architecture)
```

### リスク緩和策

1. **Feature Flag**: 新旧アーキテクチャを切り替え可能に
2. **Gradual Rollout**: 機能ごとに段階的移行
3. **A/B Testing**: 新旧比較テスト
4. **Rollback Plan**: 各フェーズでロールバック可能

---

## ✅ 品質保証計画

### テストカバレッジ目標

| レイヤー | カバレッジ | 優先度 |
|---------|-----------|--------|
| Domain | 95%+ | 最高 |
| Application | 85%+ | 高 |
| Infrastructure | 90%+ | 高 |
| Presentation | 60%+ | 中 |
| **全体** | **80%+** | - |

### CI/CDパイプライン

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

---

## 📅 タイムライン

```
Week 1-2:   Phase 1 (Infrastructure)
Week 3-4:   Phase 2 (Domain)
Week 5-6:   Phase 3 (Application)
Week 7-8:   Phase 4 (Presentation)
Week 9:     Phase 5 (main.js)
Week 10:    Phase 6 (E2E Tests)
Week 11:    Phase 7 (Performance)
Week 12-13: Phase 8 (Features)
Week 14-16: Phase 9 (TypeScript, optional)
Week 17:    Phase 10 (Documentation)
```

---

**次のステップ**: この計画を承認後、Phase 1の実装を開始します。各フェーズ完了後にPRを作成し、レビューを受けてから次フェーズに進みます。
