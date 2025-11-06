# フリーズ問題の根本原因分析レポート

## 結論

**フリーズの原因は循環参照ではなく、「過剰な同期処理の連鎖」です。**

---

## 1. モジュール循環参照チェック ✅ 問題なし

### import関係図

```
SettingsModal.js
  ├─ import Actions from 'infrastructure/state/actions.js'
  ├─ import CONFIG from 'config.js'
  └─ import generateRotationPlanes from 'mathnd.js'

actions.js
  └─ (imports nothing - pure action definitions)

main.js
  ├─ import StateStore
  ├─ import GameService
  └─ import SettingsModal
```

**結論:** モジュールレベルでの循環参照は存在しません。

---

## 2. 実行時の処理フロー分析

### 修正前の実行フロー（フリーズ発生）

```
SettingsModal.handleApply()
  │
  ├─ [1] Actions.updateSettings() dispatch (1回目)
  │    ├─ gameReducer: GameState.initial() - 新しいゲーム状態作成
  │    ├─ settingsReducer: settings state更新
  │    ├─ StateStore.dispatch() completes
  │    └─ StateStore._notifyListeners()
  │       └─ main.onStateChange() 呼び出し (1回目)
  │          └─ updateStatus() 実行 (1回目)
  │
  ├─ [2] onApply(dimensions, gridSize) callback
  │    └─ main.handleSettingsChange()
  │       │
  │       ├─ [3] gameService.updateSettings()
  │       │    ├─ Actions.updateSettings() dispatch (2回目) ← 重複！
  │       │    │  ├─ gameReducer: GameState.initial() (2回目)
  │       │    │  ├─ settingsReducer: settings更新 (2回目)
  │       │    │  └─ StateStore._notifyListeners()
  │       │    │     └─ main.onStateChange() 呼び出し (2回目)
  │       │    │        └─ updateStatus() 実行 (2回目)
  │       │    │
  │       │    └─ eventBus.emit('settings:updated')
  │       │       └─ main listener: rotations更新
  │       │
  │       └─ [4] reinitializeGame()
  │            ├─ renderer.recreateGrid() ← 重い処理
  │            │  ├─ 全cellをsceneから削除
  │            │  ├─ 全connectionsを削除
  │            │  ├─ 新しいgrid作成
  │            │  └─ 新しいconnections作成
  │            │
  │            ├─ [5] gameService.resetGame()
  │            │    └─ Actions.resetGame() dispatch (3回目のaction)
  │            │       ├─ gameReducer: GameState.initial() (3回目)
  │            │       └─ StateStore._notifyListeners()
  │            │          └─ main.onStateChange() 呼び出し (3回目)
  │            │             └─ updateStatus() 実行 (3回目)
  │            │
  │            └─ updateStatus() 直接呼び出し (4回目)
```

### 問題点の詳細

#### A. 過剰なAction Dispatch

| # | Action | トリガー元 | 結果 |
|---|--------|----------|------|
| 1 | `updateSettings` | SettingsModal | GameState初期化 |
| 2 | `updateSettings` | GameService | GameState初期化（重複） |
| 3 | `resetGame` | GameService | GameState初期化（3重） |

→ **同じGameState初期化が3回実行される**

#### B. 過剰なSubscriber通知

```
StateStore._notifyListeners() が 3回呼ばれる
  ↓
main.onStateChange() が 3回呼ばれる
  ↓
updateStatus() が 4回呼ばれる (3回 + 直接呼び出し1回)
```

#### C. 重い処理との組み合わせ

```javascript
renderer.recreateGrid() の処理内容：
1. cells配列をループ (最大 gridSize^dimensions 個)
   - 4D 4x4 = 256 cells
   - 5D 4x4 = 1024 cells
2. 各cellのgroupをsceneから削除 (Three.js処理)
3. 全connectionMeshesを削除
4. 新しいcells配列を作成
5. createGrid() - 全セルを再作成
6. createGridConnections() - 全接続を再作成
```

この重い処理の**実行中**に、さらに2回のaction dispatchとsubscriber通知が発生。

---

## 3. フリーズのメカニズム

### タイミング図

```
Time →

t0: SettingsModal.handleApply() 開始
t1: ├─ Actions.updateSettings() dispatch #1
t2: │  └─ subscribers通知 (onStateChange #1)
t3: ├─ onApply callback
t4: │  ├─ gameService.updateSettings()
t5: │  │  ├─ Actions.updateSettings() dispatch #2 ← ここで競合開始
t6: │  │  │  └─ subscribers通知 (onStateChange #2)
t7: │  │  └─ eventBus.emit('settings:updated')
t8: │  └─ reinitializeGame()
t9: │     ├─ recreateGrid() 開始 ← 重い処理開始
   :│     │  (scene manipulation, geometry creation)
   :│     │  ... 処理中 ...
t10:│     ├─ gameService.resetGame()
t11:│     │  └─ Actions.resetGame() dispatch #3 ← さらに競合
t12:│     │     └─ subscribers通知 (onStateChange #3)
   :│     │
t13:│     ├─ recreateGrid() 完了
t14:│     └─ updateStatus() #4
t15: 完了
```

### フリーズの原因

**同期的な処理の連鎖 + 重いDOM/Three.js操作**

1. JavaScriptはシングルスレッド
2. recreateGrid()はブロッキング処理（同期）
3. その実行中にさらに別の同期処理（action dispatch, reducer, subscribers）が重なる
4. ブラウザのメインスレッドがブロックされる
5. UIがフリーズする

**循環参照ではなく、過剰な同期処理のカスケード**

---

## 4. 修正による改善

### 修正後のフロー

```
SettingsModal.handleApply()
  │
  ├─ [1] Actions.setSettingsModalOpen(false) ← モーダル閉じるだけ
  │
  └─ [2] onApply(dimensions, gridSize) callback
       └─ main.handleSettingsChange()
          │
          ├─ [3] gameService.updateSettings() (1回だけ)
          │    ├─ Actions.updateSettings() dispatch
          │    │  ├─ gameReducer: GameState.initial()
          │    │  ├─ settingsReducer: settings更新
          │    │  └─ StateStore._notifyListeners()
          │    │     └─ main.onStateChange() 呼び出し (1回)
          │    │
          │    └─ eventBus.emit('settings:updated')
          │
          └─ [4] reinitializeGame()
               ├─ renderer.recreateGrid()
               ├─ gameService.resetGame()
               │    └─ Actions.resetGame() dispatch
               │       └─ subscribers通知
               │
               └─ updateStatus()
```

### 改善内容

| 項目 | 修正前 | 修正後 | 削減率 |
|------|--------|--------|--------|
| **Action dispatches** | 3回 | 2回 | -33% |
| **GameState.initial() 呼び出し** | 3回 | 2回 | -33% |
| **Subscriber通知** | 3回 | 2回 | -33% |
| **onStateChange() 呼び出し** | 3回 | 2回 | -33% |
| **updateStatus() 呼び出し** | 4回 | 3回 | -25% |

重要なのは、**重複したupdateSettingsが削除された**こと。

---

## 5. なぜ循環参照ではないか

### 循環参照の定義

**A → B → C → A** のような参照の輪

### 実際の処理フロー

```
SettingsModal → Actions.updateSettings() → reducer → subscribers
                                                         ↓
                                                    main.onStateChange()
                                                         ↓
                                                    updateStatus()
                                                         ↓
                                                      (終了)
```

その後、別の処理として：

```
SettingsModal → onApply callback → gameService.updateSettings() → ...
```

これは**循環ではなく、連続した処理**です。

### もし循環参照なら

```javascript
// こうなっているはず（なっていない）
Actions.updateSettings()
  → reducer
  → subscribers
  → main.onStateChange()
  → 何かがActions.updateSettings()を呼ぶ
  → reducer (無限ループ)
```

実際には、onStateChange()内で再度dispatchしていません。

---

## 6. 類似の問題を防ぐために

### 設計原則

1. **Single Responsibility Principle**
   - 1つの処理で1つのことだけを行う
   - 設定更新は1箇所で

2. **Avoid Redundant Operations**
   - 同じactionを複数箇所からdispatchしない
   - 必要なら、どちらか一方だけにする

3. **Separation of Concerns**
   - UIコンポーネント（SettingsModal）は状態管理をしない
   - callbackで親（main.js）に処理を委譲

### 今回の教訓

```javascript
// ❌ 悪い例：UIコンポーネントが直接state更新
handleApply() {
    this.store.dispatch(Actions.updateSettings(...));  // ← UIから直接
    this.onApply(...);  // ← さらにcallback
}

// ✅ 良い例：callbackに委譲
handleApply() {
    this.onApply(...);  // ← 親が責任を持つ
}
```

---

## 7. まとめ

### フリーズの真の原因

**「過剰な同期処理の連鎖」** であり、循環参照ではない。

具体的には：
- 同じ設定更新処理が2回実行される
- 3つのaction dispatchと3回のsubscriber通知
- 重いThree.js処理（recreateGrid）と同時実行
- メインスレッドブロッキング

### 修正の効果

- 重複処理の削減（-33%）
- クリーンな処理フロー
- フリーズの解消

### 再発防止

- 1つの操作で1回だけ状態更新
- UIコンポーネントは状態管理をcallbackに委譲
- 重い処理の前に不要なaction dispatchをしない

---

**結論: モジュール循環参照なし、実行時循環呼び出しなし、過剰な同期処理が原因**
