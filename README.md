# テトモック

テトリスとローグライクを組み合わせたデッキ構築型ゲームのWebモックアップです。盤面にミノのカードを配置して敵と戦い、ダンジョンのルートを選びながらカードやアーティファクトを集めます。UIとゲームルールを検討するためのプロジェクトです。

戦闘・報酬選択のほか、ショップ、休憩所、ランダムイベントの画面を実装しています。

## 使用技術

- React 18 / TypeScript 5 / Vite 5
- CSS（`src/index.css`）
- Docker / Docker Compose（開発環境用）

## ローカルで起動

Node.jsとpnpmを用意してください。Docker環境ではNode.js 22を使用しています。

```sh
pnpm install
pnpm dev
```

ブラウザで http://localhost:5173 を開きます。ポートが使用中の場合は、起動ログに表示されるURLを確認してください。

### Dockerで起動

```sh
docker compose up --build
```

ブラウザで http://localhost:5173 を開きます。終了は `Ctrl+C`、コンテナの削除は `docker compose down` で行えます。

## ビルドと確認

```sh
# 本番用ビルド（dist/に出力）
pnpm build

# TypeScriptの型チェック
pnpm exec tsc --noEmit

# ビルド結果を確認（先にpnpm buildを実行）
pnpm preview
```

`pnpm build`は型チェックを含みません。現在、自動テストとLintの実行スクリプトは定義されていません。変更内容に応じてビルド、型チェック、ブラウザでの動作確認を行います。

## 基本操作

- ダンジョンで進行可能なノードをクリックして移動する。
- 戦闘では手札のカードを選び、盤面をクリックして配置する。
- 選択中のカードは回転ボタン・右クリック・`R`キー・`↑`キーで回転する。`Esc`キーで選択を解除する。
- 敵をクリックして攻撃対象を選び、「ターン終了」で敵ターンへ進む。
- 「リセット」で最初からやり直す。

## ソース構成

| パス | 内容 |
| --- | --- |
| `src/App.tsx` | 画面の切り替え・操作イベントの接続 |
| `src/components/` | 各画面、盤面、手札などのUI |
| `src/gameReducer.ts` | ゲームの状態更新・進行処理 |
| `src/gameLogic.ts` | ゲームロジック |
| `src/battle/` | 戦闘イベント、ダメージ処理、各種効果 |
| `src/tetrominos.ts` | ミノ・カードなどの定義 |
| `src/types.ts` | 型定義 |
| `src/index.css` | スタイル |
| `docs/` | ゲーム・画面・各コンテンツの仕様書 |

## 仕様書と開発方針

ゲーム全体は[ゲーム仕様](./docs/GAME_SPEC.md)、UIは[画面仕様](./docs/SCREEN_SPEC.md)、戦闘ルールは[戦闘仕様](./docs/BATTLE/_SPEC.md)を参照してください。

仕様書一覧とアシスタント向け作業方針は[AGENTS.md](./AGENTS.md)にまとめています。ゲームルールやUIの仕様を変更した場合は関連する仕様書も更新し、試験的な変更の場合はその旨を明記します。
