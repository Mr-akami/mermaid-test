# Mermaid Sequence Diagram Editor

GUIでMermaidのシーケンス図を作成・編集できるブラウザアプリケーションです。

## 特徴

- **ビジュアルエディタ**: ドラッグ&ドロップでシーケンス図を作成
- **フル仕様対応**: Mermaid sequenceDiagram の全機能に対応
- **双方向変換**: GUI ⇔ Mermaid テキストの相互変換
- **軽量実装**: グラフライブラリを使わない Pure SVG 実装

## 対応機能

### 基本要素
- ✅ Participant / Actor の追加・編集
- ✅ メッセージ（10種類の矢印タイプ）
- ✅ Note（left of / right of / over）
- ✅ Activation（lifeline activation）

### 制御構造
- ✅ Loop
- ✅ Alt / Opt
- ✅ Par
- ✅ Critical
- ✅ Break
- ✅ Rect（背景ハイライト）
- ✅ Box（参加者グループ化）

### 高度な機能
- ✅ Create / Destroy participant
- ✅ マルチライン対応（`<br/>`）
- ✅ Actor Links
- ✅ Auto numbering
- ✅ スタイル・設定のカスタマイズ

## 使い方

### 開発サーバーの起動

\`\`\`bash
pnpm install
pnpm run dev
\`\`\`

ブラウザで http://localhost:5173 を開きます。

### ビルド

\`\`\`bash
pnpm run build
\`\`\`

dist フォルダにビルド成果物が生成されます。

## 操作方法

### Participant / Actor の追加
1. ツールバーから「Participant」または「Actor」を選択
2. キャンバス上をクリック
3. IDを入力

### Message の追加
1. ツールバーから「Message」を選択
2. 送信元の Participant の lifeline をクリック
3. 送信先の Participant の lifeline をクリック
4. メッセージテキストを入力（オプション）

### プロパティの編集
1. ツールバーで「選択」を選ぶ
2. 編集したい要素をクリック
3. 右側に表示されるフローティングパネルで編集

### ドラッグ操作
- **Participant**: 左右にドラッグして順序を変更
- **Message**: 上下にドラッグして順序を変更

### ブロック（Loop, Alt等）の追加
1. ツールバーから対象のブロックタイプを選択
2. キャンバス上でマウスをドラッグして範囲選択
3. ラベルを入力

### Mermaid テキストのエクスポート
1. ツールバーから「Export Mermaid」をクリック
2. 生成されたテキストをコピー

## プロジェクト構成

\`\`\`
src/
├── models/           # データモデル
│   ├── Diagram.ts
│   ├── Participant.ts
│   ├── Message.ts
│   ├── Note.ts
│   ├── Block.ts
│   └── Activation.ts
├── renderer/         # SVG描画エンジン
│   └── SVGRenderer.ts
├── ui/              # UIコンポーネント
│   ├── Toolbar.ts
│   └── FloatingPropertyPanel.ts
├── interactions/    # マウス操作ハンドラ
│   └── InteractionManager.ts
├── parser/          # Mermaid変換
│   └── MermaidGenerator.ts
├── types/           # TypeScript型定義
│   └── index.ts
└── main.ts          # エントリーポイント
\`\`\`

## 技術スタック

- **TypeScript**: 型安全な開発
- **Vite**: 高速ビルドツール
- **SVG**: グラフィックス描画
- **Pure Vanilla**: フレームワーク不使用

## ライセンス

MIT

## 参考

- [Mermaid Sequence Diagram Documentation](https://mermaid.js.org/syntax/sequenceDiagram.html)
- 仕様書: `../../doc/sequence-spec.md`
