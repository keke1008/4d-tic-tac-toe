# コーディングガイドライン / Coding Guidelines

**プロジェクト**: N次元三目並べ (N-Dimensional Tic-Tac-Toe)

このドキュメントは、プロジェクトのコーディング規約と設計原則を定義します。

---

## 📜 基本原則

### 1. JSDocの型情報を信頼する

**原則**: JSDocに記述された型情報は正確であり、実行時の型チェックは不要です。

```javascript
// ❌ 悪い例: JSDocがあるのに型チェックを重複
/**
 * @param {number} x
 * @param {number} y
 */
function add(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Invalid types');
    }
    return x + y;
}

// ✅ 良い例: JSDocを信頼し、型チェックなし
/**
 * @param {number} x
 * @param {number} y
 */
function add(x, y) {
    return x + y;
}
```

---

## 🛡️ バリデーション戦略

### バリデーションが必要な場合

以下の3つのカテゴリーのみバリデーションを行います:

#### 1. **外部入力 (External Inputs)**

ユーザー、ネットワーク、外部システムからの入力は常に検証します。

```javascript
// ✅ ユーザー入力のバリデーション
validateSettings(dimensions, gridSize) {
    if (!Number.isInteger(dimensions) ||
        dimensions < CONFIG.MIN_DIMENSIONS ||
        dimensions > CONFIG.MAX_DIMENSIONS) {
        alert('次元数が無効です');
        return false;
    }
    return true;
}
```

**適用箇所**:
- `SettingsModal.validateSettings()` - UI入力
- イベントハンドラーからの座標（マウス、タッチ）
- 将来的なネットワーク入力（マルチプレイヤーなど）

#### 2. **ビジネスロジック制約 (Business Logic Constraints)**

ゲームルール、境界条件、状態遷移の検証。

```javascript
// ✅ ゲームルールのバリデーション
placeMarker(...args) {
    const coords = Array.isArray(args[0]) ? args[0] : args;

    // ビジネスルール: 座標が範囲内か
    if (!this.isValidCoordinate(coords)) {
        return false;
    }

    // ビジネスルール: ゲームが終了していないか
    if (this.gameOver) return false;

    // ビジネスルール: セルが空いているか
    if (this.getMarker(...coords)) return false;

    this.setMarkerAt(coords, this.currentPlayer);
    return true;
}
```

**適用箇所**:
- `GameBoard.placeMarker()` - マーカー配置ルール
- `GameBoard.isValidCoordinate()` - 座標境界チェック
- ゲーム状態の検証

#### 3. **数学的安全性 (Mathematical Safety)**

除算ゼロ、オーバーフロー、数値の特殊値（NaN, Infinity）の検出。

```javascript
// ✅ 除算ゼロの保護
function projectOneDimensionDown(point, projectionDistance) {
    const lastDim = point[point.length - 1];
    const denominator = projectionDistance - lastDim;

    // 数学的安全性: 除算ゼロを防ぐ
    if (Math.abs(denominator) < CONFIG.PROJECTION_EPSILON) {
        console.warn('Near-zero denominator, using fallback');
        // 正射影にフォールバック
        return point.slice(0, -1);
    }

    const factor = projectionDistance / denominator;
    return point.slice(0, -1).map(coord => coord * factor);
}
```

**適用箇所**:
- `mathnd.js` の投影関数（除算ゼロ）
- 浮動小数点計算の精度チェック

---

### バリデーションが不要な場合

#### 内部関数呼び出し

モジュール内部またはモジュール間の関数呼び出しでは、JSDocの型を信頼します。

```javascript
// ❌ 悪い例: 内部メソッドで過剰なバリデーション
getMarker(...args) {
    const coords = Array.isArray(args[0]) ? args[0] : args;

    // 不要: 内部で呼び出される関数なので型チェック不要
    if (!Array.isArray(coords)) {
        console.warn('Invalid coords');
        return null;
    }

    return BoardAccessor.getMarkerAt(this.board, coords);
}

// ✅ 良い例: JSDocを信頼
/**
 * @param {...number|Array<number>} args
 * @returns {string|null}
 */
getMarker(...args) {
    const coords = Array.isArray(args[0]) ? args[0] : args;
    return BoardAccessor.getMarkerAt(this.board, coords);
}
```

#### 型変換済みのデータ

既に型変換やバリデーションを通過したデータは再検証しません。

```javascript
// ❌ 悪い例: 既にバリデーション済みのデータを再検証
handleCellClick(mouseX, mouseY) {
    const cell = this.renderer.getCellAtMouse(mouseX, mouseY);
    if (!cell) return;

    // 不要: cellはCellオブジェクトであることが保証されている
    const coords = cell.coordsArray || [];
    if (coords.length === 0) {
        console.error('Invalid cell');
        return;
    }

    // ...
}

// ✅ 良い例: cellの構造を信頼
handleCellClick(mouseX, mouseY) {
    const cell = this.renderer.getCellAtMouse(mouseX, mouseY);
    if (!cell) return;

    const coords = cell.coordsArray;
    // ...
}
```

---

## 🎨 コード品質原則

### DRY (Don't Repeat Yourself)

重複するロジックは共通のユーティリティに抽出します。

**例**: `BoardAccessor` ユーティリティ
- `GameBoard.getMarker()` と `WinChecker.getMarkerAt()` の重複を削除
- ボードアクセスロジックを1箇所に集約

### マジックナンバーの禁止

すべての定数は `CONFIG` オブジェクトに定義します。

```javascript
// ❌ 悪い例: マジックナンバー
detail: { delta: scaleDelta * 5 }

// ✅ 良い例: 名前付き定数
detail: { delta: scaleDelta * CONFIG.PINCH_ZOOM_MULTIPLIER }
```

### 単一責任の原則

各クラス・関数は1つの明確な責任を持ちます。

**例**:
- `BoardAccessor` - ボードアクセスのみ
- `WinChecker` - 勝利判定のみ
- `GameBoard` - ゲーム状態管理のみ

---

## 📝 ドキュメント規約

### JSDoc の書き方

すべての公開関数・メソッドにJSDocを記述します。

```javascript
/**
 * Rotate an N-dimensional point through specified rotation planes
 * @param {Array<number>} point - N-dimensional point
 * @param {Object} rotations - Rotation angles by plane name (e.g., {xy: 0.5})
 * @param {number} [dimensions] - Number of dimensions (defaults to point.length)
 * @returns {Array<number>} Rotated N-dimensional point
 *
 * @example
 * rotateND([1, 0, 0, 0], {xy: Math.PI/2, xw: Math.PI/4}, 4)
 */
export function rotateND(point, rotations, dimensions = null) {
    // ...
}
```

**必須要素**:
- 関数の目的を1行で説明
- すべてのパラメータの型と説明
- 戻り値の型と説明
- 必要に応じて例（`@example`）

---

## 🔧 命名規約

### ファイル・クラス名

- **PascalCase**: クラスファイル（`GameBoard.js`, `WinChecker.js`）
- **camelCase**: ユーティリティファイル（`mathnd.js`, `config.js`）

### 変数・関数名

- **camelCase**: 変数、関数、メソッド（`rotateND`, `getCellAtMouse`）
- **UPPER_SNAKE_CASE**: 定数（`CONFIG.GRID_SIZE`, `CONFIG.PINCH_ZOOM_MULTIPLIER`）

### 意味のある名前

```javascript
// ❌ 悪い例: 省略形や意味不明な名前
function proj(p, d) { ... }
const tmp = getData();

// ✅ 良い例: 明確で説明的な名前
function projectNDto3D(point, projectionDistance) { ... }
const rotatedPoint = getRotatedPoint();
```

---

## 🚀 パフォーマンス原則

### 不要な計算を避ける

毎フレーム実行される関数では、必要な時のみ計算します。

```javascript
// 将来的な最適化（Phase 3）:
// Dirty フラグパターンを使い、変更時のみ再計算
updateCellPositions() {
    if (!this.needsUpdate) return;  // 変更がなければスキップ

    this.cells.forEach(cell => {
        // 回転計算...
    });

    this.needsUpdate = false;
}
```

### メモリ効率

- 2D-4D: ネストされた配列（高速アクセス）
- 5D+: Map（メモリ効率）

---

## 🧪 テスト方針（将来的）

### テストが必要な箇所

1. **数学関数** (`mathnd.js`)
   - 回転計算の正確性
   - 投影の正確性

2. **ゲームロジック** (`GameBoard.js`, `WinChecker.js`)
   - 勝利判定
   - ボード状態管理

3. **ユーティリティ** (`BoardAccessor.js`)
   - ボードアクセスロジック

### テストが不要な箇所

- UIコンポーネント（手動テストで十分）
- Three.jsレンダリング（視覚的検証）

---

## 📚 参考資料

- **REFACTOR.md** - 詳細なリファクタリング計画
- **README.md** - プロジェクト概要と使用方法
- **JSDoc仕様**: https://jsdoc.app/

---

## ✨ まとめ

このプロジェクトのコーディング哲学:

1. **JSDocを信頼** - 型は契約
2. **必要な場所でのみバリデーション** - 外部入力、ビジネスルール、数学的安全性
3. **DRY原則** - 重複を避ける
4. **明確な命名** - コードが自己説明的
5. **適切なドキュメント** - JSDocで仕様を明確に

**目標**: クリーンで保守しやすく、パフォーマンスの高いコード

---

**更新履歴**:
- 2025-11-05: 初版作成（Phase 1-4 リファクタリング完了後）
