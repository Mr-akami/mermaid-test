# Sequence Diagram Editor (diagram-js)

GUIでMermaidのシーケンス図を作成・編集できるブラウザアプリケーションです。diagram-jsをベースに実装されています。

## 機能

### 基本機能
- ✅ **Participant/Actorの作成**: パレットからドラッグ&ドロップで配置
- ✅ **メッセージの作成**: 要素間を接続してメッセージを作成
- ✅ **ノートの追加**: 注釈を追加可能
- ✅ **ブロック構造**: Loop, Alt, Opt などの制御構造をサポート
- ✅ **プロパティ編集**: 要素を選択してプロパティを編集
- ✅ **Mermaidエクスポート**: 作成した図をMermaid形式で出力

### サポートされている要素

#### 参加者
- **Participant**: 矩形のライフライン（`participant`）
- **Actor**: 人型アイコン（`actor`）
- 識別子とラベルの設定
- 相互変換が可能

#### メッセージ（全10種類の矢印）
- `->`: 実線、矢印なし
- `-->`: 破線、矢印なし
- `->>`: 実線、矢印あり
- `-->>`: 破線、矢印あり
- `<<->>`: 実線、両端矢印
- `<<-->>`: 破線、両端矢印
- `-x`: 実線、×印（破棄）
- `--x`: 破線、×印
- `-)`: 実線、開き矢印（非同期）
- `--)`: 破線、開き矢印

#### ノート
- 左配置（`Note left of`）
- 右配置（`Note right of`）
- 複数要素にまたがる配置（`Note over`）

#### 制御構造ブロック
- Loop（繰り返し）
- Alt（条件分岐）
- Opt（オプション）
- Par（並列）
- Critical（クリティカル領域）
- Break（中断）
- Rect（背景ハイライト）
- Box（グループ化）

## 使い方

### 起動

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev
```

ブラウザで http://localhost:50004/ を開きます。

### 基本操作

1. **要素の追加**
   - 左側のパレットから要素（Participant、Actor、Note、Blockなど）をクリック
   - キャンバス上の任意の場所をクリックして配置

2. **メッセージの作成**
   - Participant/Actorをクリックして選択
   - コンテキストパッド（要素の周りに表示）の「Connect」ボタンをクリック
   - 接続先のParticipant/Actorをクリック

3. **プロパティの編集**
   - 要素をクリックして選択
   - 右側のプロパティパネルで値を編集
   - 識別子、ラベル、矢印の種類、テキストなどを変更可能

4. **要素の移動**
   - 要素をドラッグして移動
   - メッセージは上下にドラッグして順序を変更

5. **Mermaidへのエクスポート**
   - 「Export Mermaid」ボタン: ファイルとしてダウンロード
   - 「Copy to Clipboard」ボタン: クリップボードにコピー
   - 右側のMermaid Outputエリア: リアルタイムでMermaidコードを表示

### ショートカット

- **削除**: 要素を選択してコンテキストパッドの削除ボタン
- **タイプ変換**: Participantを選択してプロパティパネルから「Convert to Actor」

## プロジェクト構造

```
src/
├── main.ts                          # エントリーポイント
├── SequenceDiagram.ts               # メインのダイアグラムクラス
├── style.css                        # スタイル
├── types/
│   ├── sequence.ts                  # シーケンス図の型定義
│   ├── diagram-js.d.ts             # diagram-jsの型定義
│   ├── tiny-svg.d.ts               # tiny-svgの型定義
│   └── min-dash.d.ts               # min-dashの型定義
└── modules/
    ├── renderer/
    │   └── SequenceRenderer.ts      # カスタムレンダラー
    ├── palette/
    │   └── SequencePalette.ts       # パレット（要素追加）
    ├── contextPad/
    │   └── SequenceContextPad.ts    # コンテキストパッド（操作）
    ├── rules/
    │   └── SequenceRules.ts         # 操作ルール
    ├── modeling/
    │   └── SequenceModeling.ts      # モデリング機能
    ├── ordering/
    │   └── SequenceOrderingBehavior.ts  # 順序管理
    ├── properties/
    │   └── PropertiesPanel.ts       # プロパティパネル
    └── export/
        └── MermaidExporter.ts       # Mermaidエクスポート
```

## 技術スタック

- **diagram-js**: ダイアグラムエディタのコアライブラリ
- **TypeScript**: 型安全な開発
- **Vite**: 高速なビルドツール
- **tiny-svg**: SVG操作ユーティリティ

## 仕様書

詳細な仕様は `doc/sequence-spec.md` を参照してください。

## ビルド

```bash
# プロダクションビルド
pnpm run build

# プレビュー
pnpm run preview
```

## 今後の拡張予定

- [ ] アクティベーション（ライフライン上の実行バー）の完全サポート
- [ ] より高度なブロック構造のネスト
- [ ] Mermaidファイルのインポート機能
- [ ] テーマのカスタマイズ
- [ ] Undo/Redo機能
- [ ] キーボードショートカット
- [ ] 自動配置機能
- [ ] SVGエクスポート

## ライセンス

MIT
