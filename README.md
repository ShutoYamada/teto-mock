# テトモック

テトリスとローグライクを組み合わせたデッキ構築型ゲームのWebモックアップです。盤面にミノのカードを配置して敵と戦い、ダンジョンのルートを選びながらカードやアーティファクトを集めます。UIとゲームルールを検討するためのプロジェクトです。

3ステージ構成で、各ステージ3種類、合計9種類のボスが出現します。各ステージのボスは開始時に公開されます。戦闘・報酬選択のほか、ショップ、休憩所、ランダムイベントの画面を実装しています。

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
pnpm typecheck

# ボス戦・ステージ進行・呪いの回帰テスト
pnpm test

# ビルド結果を確認（先にpnpm buildを実行）
pnpm preview
```

`pnpm build`は型チェックを含みません。ボス戦・ステージ進行・呪いの自動テストを用意しています。Lintの実行スクリプトは現在定義されていません。変更内容に応じてビルド、型チェック、ブラウザでの動作確認を行います。

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
| `tests/curses.test.ts` | 呪い・弱点ブロック・封鎖状態の回帰テスト |
| `src/curses.ts` | 呪いカードの定義・生成・ターン終了時の発動処理 |
| `tests/bosses.test.ts` | ボス戦・ステージ進行・報酬の回帰テスト |
| `src/battle/` | 戦闘イベント、ダメージ処理、各種効果 |
| `src/tetrominos.ts` | ミノ・カードなどの定義 |
| `src/types.ts` | 型定義 |
| `src/index.css` | スタイル |
| `docs/` | ゲーム・画面・各コンテンツの仕様書 |

## 仕様書と開発方針

ゲーム全体は[ゲーム仕様](./docs/GAME_SPEC.md)、UIは[画面仕様](./docs/SCREEN_SPEC.md)、戦闘ルールは[戦闘仕様](./docs/BATTLE/_SPEC.md)を参照してください。

仕様書一覧とアシスタント向け作業方針は[AGENTS.md](./AGENTS.md)にまとめています。ゲームルールやUIの仕様を変更した場合は関連する仕様書も更新し、試験的な変更の場合はその旨を明記します。

## GitHub Pagesへのデプロイ

`.github/workflows/deploy.yml` が `main` / `master` へのpush、または手動実行で動きます。リポジトリの Settings → Pages → Source は GitHub Actions に設定してください。

ビルドジョブで `dist/index.html` を確認し、`github-pages` という名前でPages用成果物をアップロードします。デプロイジョブはその完了を待ち、返された成果物IDが同じワークフロー実行の有効な成果物か確認してから公開します。成果物の保持期間は7日です。

`No artifacts named "github-pages"` が出た場合は、ビルドジョブのアップロード結果と成果物の保持期限を確認してください。削除済み・期限切れの場合は、デプロイジョブだけでなく **Re-run all jobs** または新しい手動実行で、ビルドからやり直してください。
