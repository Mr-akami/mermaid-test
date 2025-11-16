# リファクタリング設計方針

## 基本方針
コンポーネントを3層に分離し、Canvas2Dなどのレンダリング技術への依存を最小化する。

## 1. Model層 (DiagramModel)
**責務**: ドメインデータの管理
- 参加者、メッセージ、制御構造などのCRUD API
- **Observer パターンで変更を通知**
- **幾何計算や位置情報は持たない**

**変更**: 現状維持（すでに適切に分離されている）

## 2. Intersection/Geometry層 (Utils)
**責務**: レンダリング技術に依存しない純粋な幾何・交差判定処理
- `GeometryUtils`: 点・矩形・線の幾何計算（点が矩形内か、矩形同士の重なりなど）
- `HitTestUtils`: 要素の交差判定（どの要素がクリックされたか、リサイズハンドルの判定など）
- `CoordinateUtils`: 座標計算（ライフライン位置、メッセージ端点など）

**変更**:
- Rendererから交差判定ロジックを分離してHitTestUtilsへ統合
- 不足している`getResizeHandle()`を追加

## 3. Handler層 (InteractionHandler)
**責務**: ユーザー操作の制御フロー
- マウスイベントのハンドリング
- 操作モード管理（選択、追加、ドラッグなど）
- **Utils層の純粋関数を使って判定**
- **Model層のAPIを呼んで状態更新**
- 状態変化は `DiagramModel.update(mutator)` で mutable state に対して直接行い、Observer 経由で Renderer の `render.update(state)` を自動実行させる

**変更**:
- Rendererへの直接的な交差判定呼び出しを削除
- 全ての幾何・交差判定をUtils層経由に統一
- Renderer APIは視覚更新のみに限定

## 4. Observer パターンによる自動レンダリング
**仕組み**:
```
Model変更 → notifyObservers() → Renderer.update()
```

**実装**:
- RendererがModelのObserverとして登録
- Model変更時、自動的に再描画が実行される
- Handler は Model を更新するだけで、明示的なレンダリング呼び出し不要

## 分離後の依存関係
```
Handler → Utils (交差判定)
Handler → Model (データ更新)
Renderer ← Model (Observer経由で変更通知)
Utils → (依存なし、純粋関数)
Model → (依存なし、ドメインロジックのみ)
```

## 成果
- Canvas2D/WebGL/SVGなど、レンダリング技術を知らなくてもUtils層とModel層が再利用可能
- Modelの変更が自動的にレンダリングに反映
- テスタビリティ向上（Utils層は純粋関数、Model層は独立）
- 責務の明確化
