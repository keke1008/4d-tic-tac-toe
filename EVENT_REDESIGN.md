# イベントアーキテクチャ再設計

## 現状の問題点

### 1. イベントの責務が不明確

```javascript
// GameService.resetGame()
this.store.dispatch(Actions.resetGame(settings));  // State更新
this.eventBus.emit('game:reset', { settings });    // イベント発火
```

**問題:**
- `game:reset`は「リセットする」コマンドなのか、「リセットされた」通知なのか不明
- リスナーが`reinitializeGame()`を呼ぶと、再度`resetGame()`が呼ばれて無限ループ

### 2. イベントとActionの重複

```javascript
// 同じことを2回行っている
gameService.updateSettings(newSettings);  // → Actions.updateSettings() + emit('settings:updated')
gameService.resetGame();                  // → Actions.resetGame() + emit('game:reset')
```

### 3. 責務の混在

- **GameService**: ビジネスロジック + State管理 + イベント発火
- **main.js**: UI調整 + レンダリング + イベントリスナー + State購読

---

## 再設計原則

### 原則1: イベントは「過去の事実」を通知

```javascript
// ✅ Good: 過去形で何が起きたかを表す
eventBus.emit('game:stateReset', { settings });
eventBus.emit('marker:placed', { position, player });
eventBus.emit('settings:changed', { oldSettings, newSettings });

// ❌ Bad: 命令形（コマンド）になっている
eventBus.emit('game:reset', { settings });  // これはコマンドに見える
```

### 原則2: Command-Query Separation

```javascript
// Commands (状態を変更する)
gameService.resetGame();
gameService.updateSettings(newSettings);
gameService.placeMarker(position);

// Events (変更を通知する)
eventBus.emit('game:stateReset');
eventBus.emit('settings:changed');
eventBus.emit('marker:placed');
```

### 原則3: 循環参照の防止

```
❌ 悪い設計（循環）:
Component A → emit('event') → Listener B → call Component A method → emit('event') ...

✅ 良い設計（一方向）:
Component A → emit('event') → Listener B → 独自の処理（Component Aを呼ばない）
```

---

## 新しいイベント設計

### イベントカテゴリー

#### 1. Game State Events (ゲーム状態の変更通知)

| イベント名 | 発火タイミング | ペイロード | 目的 |
|-----------|---------------|-----------|------|
| `game:stateReset` | ゲーム状態がリセットされた後 | `{ settings }` | UIの同期（スコア表示のクリアなど） |
| `game:markerPlaced` | マーカーが置かれた後 | `{ position, player }` | レンダラーへの描画指示 |
| `game:moveUndone` | 手が取り消された後 | `{ move }` | レンダラーのマーカー削除 |
| `game:moveRedone` | 手がやり直された後 | `{ move }` | レンダラーのマーカー追加 |
| `game:won` | ゲームに勝利した後 | `{ winner, winningLine }` | 勝利演出 |
| `game:draw` | 引き分けになった後 | `{}` | 引き分け演出 |

#### 2. Settings Events (設定変更通知)

| イベント名 | 発火タイミング | ペイロード | 目的 |
|-----------|---------------|-----------|------|
| `settings:changed` | 設定が変更された後 | `{ oldSettings, newSettings }` | グリッド再作成などの重い処理 |
| `settings:dimensionsChanged` | 次元数が変更された後 | `{ oldDimensions, newDimensions }` | 回転軸の更新 |

#### 3. UI Events (UI操作の通知)

これらは既存のInputControllerが処理

---

## 実装設計

### 1. GameServiceの責務を明確化

```javascript
class GameService {
    // Commands: 状態を変更する（Actionをdispatch）
    placeMarker(position) {
        // 1. State更新
        this.store.dispatch(Actions.placeMarker(position));

        // 2. イベント発火（通知のみ、再度Commandを呼ばない）
        const state = this.store.getState();
        this.eventBus.emit('game:markerPlaced', {
            position,
            player: state.game.currentPlayer
        });
    }

    resetGameState() {
        // State更新のみ（名前を変更して責務を明確に）
        const settings = this.store.getState().settings;
        this.store.dispatch(Actions.resetGame(settings));
        this.store.dispatch(Actions.setPreviewCell(null));

        // イベント発火（リセット完了の通知）
        this.eventBus.emit('game:stateReset', { settings });
    }

    updateSettings(newSettings) {
        const oldSettings = this.store.getState().settings;

        // State更新
        this.store.dispatch(Actions.updateSettings(newSettings));

        // イベント発火
        this.eventBus.emit('settings:changed', {
            oldSettings,
            newSettings
        });
    }
}
```

### 2. main.jsでの処理フロー

```javascript
class Game {
    setupEventListeners() {
        // Rendering events: レンダラーへの描画指示
        this.eventBus.on('game:markerPlaced', ({ position, player }) => {
            const cell = this.renderer.getCellByCoords(position);
            if (cell) {
                this.renderer.createMarker(cell, player);
            }
        });

        // Settings events: 重い処理（グリッド再作成）
        this.eventBus.on('settings:changed', ({ newSettings }) => {
            // グリッド再作成だけ行う（resetGameStateは呼ばない）
            this.renderer.recreateGrid(
                newSettings.dimensions,
                newSettings.gridSize
            );
            this.rotations = RotationInitializer.createRotations(
                newSettings.dimensions
            );
        });

        // State reset events: UI同期
        this.eventBus.on('game:stateReset', () => {
            // UIの更新のみ
            this.updateStatus();
        });
    }

    handleSettingsChange(dimensions, gridSize) {
        // 1. 設定を更新（これがsettings:changedを発火）
        this.gameService.updateSettings({ dimensions, gridSize });

        // 2. ゲーム状態をリセット（これがgame:stateResetを発火）
        this.gameService.resetGameState();

        // イベントリスナーが残りの処理を行う（循環なし）
    }
}
```

### 3. フロー図（循環なし）

```
User: 設定変更
  ↓
handleSettingsChange(dims, gridSize)
  ↓
  ├─ gameService.updateSettings()
  │    ├─ dispatch(Actions.updateSettings())
  │    └─ emit('settings:changed')
  │         └─ Listener: renderer.recreateGrid() ✓ (終了)
  │
  └─ gameService.resetGameState()
       ├─ dispatch(Actions.resetGame())
       └─ emit('game:stateReset')
            └─ Listener: updateStatus() ✓ (終了)

→ 循環なし！
```

---

## 移行計画

### Phase 1: イベント名の変更

```javascript
// Old → New
'game:reset' → 'game:stateReset'
'game:undone' → 'game:moveUndone'
'game:redone' → 'game:moveRedone'
'settings:updated' → 'settings:changed'
```

### Phase 2: GameServiceメソッド名の変更

```javascript
// Old → New
resetGame() → resetGameState()  // 責務を明確に
```

### Phase 3: イベントリスナーの整理

- 各イベントの責務を明確化
- 循環参照の完全排除
- ドキュメント化

---

## Benefits（利点）

### 1. 循環参照の完全排除

✅ イベントリスナーがCommandを呼ばない
✅ 一方向のデータフロー
✅ 無限ループ不可能

### 2. 責務の明確化

✅ GameService: Commandの実行 + イベント発火
✅ EventListeners: 副作用のみ（描画、UI更新）
✅ main.js: 調整役（オーケストレーション）

### 3. テスタビリティ向上

✅ 各イベントを個別にテスト可能
✅ Commandとイベントを分離してテスト

### 4. 保守性向上

✅ イベント名から責務が明確
✅ 新しい開発者が理解しやすい
✅ ドキュメントと実装が一致

---

## まとめ

### 現在の問題

- `game:reset`が無限再帰を引き起こす
- イベントの責務が不明確
- CommandとEventの混在

### 解決策

- **イベントは通知のみ**（過去形、受動態）
- **循環参照の完全排除**（リスナーはCommandを呼ばない）
- **責務の明確化**（Command/Query/Event分離）

### 実装方針

1. イベント名を変更（`game:reset` → `game:stateReset`）
2. メソッド名を変更（`resetGame` → `resetGameState`）
3. イベントリスナーを整理（副作用のみ）
4. フローを一方向に統一

これにより、根本的に循環参照を防止し、保守性の高いイベントアーキテクチャを実現します。
