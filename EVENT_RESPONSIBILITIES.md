# イベント責務定義書

このドキュメントは、アプリケーション内の各イベントの責務（Precondition, Postcondition, 実装場所）を明確に定義します。

## イベント設計原則

1. **イベントは過去の事実を通知**：過去形で命名（例：`game:stateReset`）
2. **イベントリスナーはCommandを呼ばない**：副作用（描画、UI更新）のみ実行
3. **一方向データフロー**：State変更 → Event発火 → View同期

---

## 1. Game Events

### `game:markerPlaced`

**発火タイミング**：マーカーがゲーム状態に追加された直後

**Precondition**：
- `moveHistory`に新しい手が追加済み
- `currentPlayer`が次のプレイヤーに切り替わり済み

**Postcondition**：
- レンダラーに新しいマーカーが描画される
- ビューがゲーム状態と同期される

**ペイロード**：
```javascript
{
    position: number[],  // マーカーの位置座標
    player: 'X' | 'O'    // マーカーを置いたプレイヤー
}
```

**発火場所**：`GameService.placeMarker()`

**リスナー責務**（in main.js）：
- レンダラーにマーカーを描画
- 他のCommandを呼ばない

---

### `game:stateReset`

**発火タイミング**：ゲーム状態（moveHistory, currentPlayer等）がリセットされた直後

**Precondition**：
- `moveHistory`が空になっている
- `redoStack`が空になっている
- `currentPlayer`が'X'にリセット済み
- `winner`が`null`
- プレビュー選択がクリア済み

**Postcondition**：
- レンダラーの全マーカーがクリアされる
- UIステータスが初期状態（プレイヤーXのターン）に更新される
- ビューが空のゲーム状態と同期される

**ペイロード**：
```javascript
{
    settings: {         // リセット時の設定（参考情報）
        dimensions: number,
        gridSize: number
    }
}
```

**発火場所**：`GameService.resetGameState()`

**リスナー責務**（in main.js）：
- レンダラーの全マーカーをクリア（`renderer.clearMarkers()`）
  - セルのマーカーフラグをクリア（marker, isSelected, player）
  - セルの色をW座標ベースの深度視覚化色にリセット（`updateCellPositions()`を内部で呼ぶ）
  - 接続線の色をデフォルトにリセット（`updateConnectionLines()`を内部で呼ぶ）
- UIステータスを更新（`updateStatus()`）
- 他のCommandを呼ばない

---

### `game:moveUndone`

**発火タイミング**：最後の手が`moveHistory`から`redoStack`に移動された直後

**Precondition**：
- 最後の手が`moveHistory`から削除済み
- その手が`redoStack`に追加済み
- `currentPlayer`が前のプレイヤーに戻っている

**Postcondition**：
- レンダラーから該当マーカーが削除される
- UIステータスが更新される

**ペイロード**：
```javascript
{
    move: {            // 取り消された手の情報
        position: number[],
        player: 'X' | 'O'
    }
}
```

**発火場所**：`GameService.undo()`

**リスナー責務**（in main.js）：
- UIステータスを更新（`updateStatus()`）
- **注意**：マーカー削除は`handleUndo()`で既に処理済み（重複回避）

---

### `game:moveRedone`

**発火タイミング**：手が`redoStack`から`moveHistory`に戻された直後

**Precondition**：
- 手が`redoStack`から削除済み
- その手が`moveHistory`に追加済み
- `currentPlayer`が次のプレイヤーに切り替わり済み

**Postcondition**：
- レンダラーに該当マーカーが再描画される
- UIステータスが更新される

**ペイロード**：
```javascript
{
    move: {            // やり直された手の情報
        position: number[],
        player: 'X' | 'O'
    }
}
```

**発火場所**：`GameService.redo()`

**リスナー責務**（in main.js）：
- UIステータスを更新（`updateStatus()`）
- **注意**：マーカー追加は`handleRedo()`で既に処理済み（重複回避）

---

## 2. Settings Events

### `settings:changed`

**発火タイミング**：設定（dimensions, gridSize等）が変更された直後

**Precondition**：
- 新しい設定がStateに保存済み
- **重要**：ゲーム状態がリセット済みであることが望ましい（マーカーなし）

**Postcondition**：
- 新しい設定でグリッドが再作成される
- 回転軸が新しい次元数に合わせて更新される
- レンダラーが新しい設定と同期される

**ペイロード**：
```javascript
{
    oldSettings: {     // 変更前の設定
        dimensions: number,
        gridSize: number
    },
    newSettings: {     // 変更後の設定
        dimensions: number,
        gridSize: number
    }
}
```

**発火場所**：`GameService.updateSettings()`

**リスナー責務**（in main.js）：
- グリッドを再作成（`renderer.recreateGrid()`）
- 回転軸を更新（`RotationInitializer.createRotations()`）
- 他のCommandを呼ばない

---

## 3. 複合操作フロー

### 設定変更とリスタート（`handleSettingsChange`）

**目的**：設定を変更してゲームを最初から開始する

**実行順序**：
```javascript
1. resetGameState()
   → Precondition: なし
   → Postcondition: moveHistory空, マーカークリア済み
   → Event: game:stateReset
   → Listener: clearMarkers() + updateStatus()

2. updateSettings({ dimensions, gridSize })
   → Precondition: moveHistory空（Step 1で保証）
   → Postcondition: 新設定でグリッド再作成
   → Event: settings:changed
   → Listener: recreateGrid() + 回転軸更新
```

**なぜこの順序か**：
- グリッド再作成時にmoveHistoryが空であることを保証
- 古いマーカーが新しいグリッドに表示されることを防止

---

## 4. State-View同期戦略

### 同期の原則

```
State変更（Action dispatch） → Event発火 → View更新（Listener）
```

### リスナーの責務

1. **描画系**：Renderer APIを呼ぶ（`createMarker`, `clearMarkers`, `recreateGrid`等）
2. **UI更新系**：UIManager APIを呼ぶ（`updateStatus`等）
3. **禁止事項**：GameServiceのCommandを呼ばない（循環防止）

### ベストプラクティス

- **Preconditionを信頼**：イベント発火前にStateが正しく更新されていることを前提とする
- **Postconditionを保証**：リスナーは自分の責務（描画、UI更新）を確実に実行する
- **冪等性**：同じイベントを複数回受信しても安全に動作する

---

## 5. 未実装イベント（将来の拡張）

### `game:won`

**発火タイミング**：勝利条件が満たされた直後

**ペイロード**：
```javascript
{
    winner: 'X' | 'O',
    winningLine: number[][]  // 勝利ラインのセル座標
}
```

**リスナー責務**：
- 勝利ラインをハイライト
- 勝利メッセージを表示

### `game:draw`

**発火タイミング**：引き分け条件が満たされた直後

**ペイロード**：
```javascript
{}
```

**リスナー責務**：
- 引き分けメッセージを表示

---

## まとめ

### 設計の原則

1. **各イベントの責務を明確に定義**（Precondition, Postcondition）
2. **実装場所を明記**（発火場所、リスナー場所）
3. **複合操作の順序を説明**（なぜその順序か理由も記載）

### 実装時のチェックリスト

- [ ] イベント名は過去形か？
- [ ] Preconditionは明確か？
- [ ] Postconditionは明確か？
- [ ] リスナーがCommandを呼んでいないか？
- [ ] 循環参照の可能性はないか？
- [ ] 実装がドキュメントと一致しているか？
