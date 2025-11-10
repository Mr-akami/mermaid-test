# トラブルシューティング

## 問題: メッセージや要素が表示されない

### 1. キャンバスが表示されているか確認

1. ブラウザで http://localhost:50005/ を開く
2. 画面中央にキャンバス（白い領域）が表示されているか確認
3. **キャンバス左上に赤い文字で「Canvas: 800x600」のような表示があるか確認**
   - この表示がある → キャンバスは正常にレンダリングされています
   - この表示がない → キャンバスが表示されていない可能性があります

### 2. ブラウザのコンソールを確認

1. F12キーを押して開発者ツールを開く
2. 「Console」タブをクリック
3. 次のようなログが表示されているか確認：
   ```
   Canvas size: 800 x 600
   Rendering diagram with 3 participants and 4 elements
   Participant positions: [["Alice", 100], ["Bob", 280], ["Charlie", 460]]
   Rendering 3 messages
   Drawing message from Alice to Bob at y= 180 fromX= 100 toX= 280
   Drawing message from Bob to Charlie at y= 220 fromX= 280 toX= 460
   Drawing message from Charlie to Alice at y= 260 fromX= 460 toX= 100
   ```

### 2. エラーがある場合

コンソールに赤いエラーメッセージが表示されている場合：
- エラーメッセージのスクリーンショットを撮る
- ブラウザをリロード（Ctrl+R または Cmd+R）してみる
- ブラウザのキャッシュをクリアしてみる

### 3. 画面が真っ白の場合

- 開発サーバーが起動しているか確認:
  ```bash
  pnpm dev
  ```
- ブラウザのアドレスバーに `http://localhost:50005/` が正しく入力されているか確認
- 別のブラウザで試してみる（Chrome, Firefox, Edgeなど）

### 4. ボタンが表示されない場合

- ツールバーが画面上部に表示されているか確認
- ブラウザウィンドウのサイズを調整してみる
- CSSが正しく読み込まれているか確認（開発者ツールのNetworkタブ）

### 5. キャンバスが表示されない場合

- 開発者ツールのElementsタブで `<canvas id="renderCanvas">` が存在するか確認
- キャンバスのサイズが 0x0 になっていないか確認

### 6. デバッグ方法

main.tsの先頭に以下を追加して詳細ログを表示：
```typescript
console.log('Application starting...');
console.log('Sample diagram:', sampleDiagram);
```

## 問題: 作成したメッセージが表示されない

### 確認事項

1. 「Create Message」ボタンをクリックしたか
2. アラートメッセージ「Click on a lifeline...」が表示されたか
3. ライフライン（点線の縦線）を2回クリックしたか
4. ブラウザのコンソールに「Drawing message from...」というログが表示されているか

### 解決方法

1. ページをリロード
2. Participant を2つ以上追加
3. 再度メッセージ作成を試す

## サポート

問題が解決しない場合は、以下の情報を提供してください：
- ブラウザの種類とバージョン
- コンソールのエラーメッセージ
- スクリーンショット
