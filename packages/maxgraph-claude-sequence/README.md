# Sequence Diagram Editor with maxGraph

maxGraphを使用したMermaidシーケンス図のGUIエディタです。マウス操作で図を作成・編集でき、Mermaid形式でエクスポートできます。

## 機能

### 実装済み機能

- ✅ **Participantの作成**: パーティシパント(矩形)とアクター(人型アイコン)の追加
- ✅ **ライフラインの表示**: 各participantから縦に伸びる破線
- ✅ **メッセージの作成**: ライフライン間でクリックしてメッセージを作成
- ✅ **10種類の矢印タイプ**:
  - `->` (実線、矢印なし)
  - `-->` (破線、矢印なし)
  - `->>` (実線、矢印あり)
  - `-->>` (破線、矢印あり)
  - `<<->>` (実線、両端矢印)
  - `<<-->>` (破線、両端矢印)
  - `-x` (実線、×印)
  - `--x` (破線、×印)
  - `-)` (実線、開矢印)
  - `--))` (破線、開矢印)
- ✅ **プロパティパネル**: 選択した要素のプロパティをリアルタイム編集
- ✅ **ドラッグ&ドロップ**: participantとmessageの位置変更
- ✅ **Mermaidエクスポート**: シーケンス図をMermaid形式でエクスポート
- ✅ **型定義**: TypeScriptによる完全な型安全性

### 今後実装予定

- ⏳ **Noteの追加**: participantの左右または上にメモを配置
- ⏳ **制御構造**: loop, alt, opt, par, critical, break, rect
- ⏳ **Activation**: ライフラインの活性化表示
- ⏳ **Boxグループ**: participantのグループ化
- ⏳ **作成/破棄**: participantの動的な作成と破棄

## 使い方

### 開発サーバーの起動

\`\`\`bash
pnpm install
pnpm run dev
\`\`\`

ブラウザで http://localhost:5175/ を開きます。

### 基本操作

#### 1. Participantの追加

1. ツールバーの「📦 Participant」または「👤 Actor」ボタンをクリック
2. キャンバス上の任意の位置をクリック
3. ラベル名を入力

#### 2. メッセージの作成

1. ツールバーの「➡️ Message」ボタンをクリック
2. 送信元のライフライン(縦の破線)をクリック
3. 送信先のライフラインをクリック
4. メッセージが作成されます

#### 3. プロパティの編集

1. 図の要素(participant, message)をクリックして選択
2. 右側のプロパティパネルで以下を編集:
   - **Participant**: タイプ(Participant/Actor)、ラベル
   - **Message**: 矢印タイプ、メッセージテキスト

#### 4. 位置の変更

- **Participant**: ドラッグして水平方向に移動可能
- **Message**: ドラッグして上下に移動可能(順序を変更)

#### 5. Mermaidへのエクスポート

1. ツールバーの「📤 Export」ボタンをクリック
2. モーダルウィンドウにMermaidコードが表示されます
3. 「Copy to Clipboard」でクリップボードにコピー
4. 「Download」でファイルとしてダウンロード

### エクスポート例

作成した図をエクスポートすると、以下のようなMermaidコードが生成されます:

\`\`\`mermaid
sequenceDiagram
    actor Alice
    participant Server
    actor Bob
    Alice->>Server: Request
    Server->>Bob: Forward
    Bob-->>Server: Response
    Server-->>Alice: Reply
\`\`\`

## プロジェクト構造

\`\`\`
src/
├── model/
│   ├── types.ts           # 型定義
│   └── DiagramModel.ts    # データモデル
├── graph/
│   └── SequenceGraph.ts   # maxGraphラッパー
├── ui/
│   ├── Toolbar.ts         # ツールバー
│   └── PropertyPanel.ts   # プロパティパネル
├── export/
│   └── MermaidExporter.ts # Mermaidエクスポート
├── main.ts                # メインアプリケーション
└── style.css              # スタイル
\`\`\`

## 仕様

このエディタは `/doc/sequence-spec.md` の仕様に基づいています:

- MermaidのsequenceDiagram構文を完全サポート
- 双方向同期(GUI ⇔ Mermaid テキスト)を目指す設計
- 制約とバージョン差異を考慮したモデル

## 技術スタック

- **maxGraph**: グラフ描画ライブラリ
- **TypeScript**: 型安全な開発
- **Vite**: 高速ビルドツール
- **pnpm**: パッケージマネージャー

## ビルド

\`\`\`bash
pnpm run build
\`\`\`

ビルド結果は `dist/` ディレクトリに出力されます。

## ライセンス

MIT
