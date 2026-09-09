# CLAUDE.md

セットアップとデプロイのコマンドは README.md を参照。

## 日付の扱い

Netlify のビルドは **UTC** で走る。事前レンダリングした結果と閲覧者のブラウザでの
再計算が食い違うとハイドレーションが壊れるため、日付の判定・表示は必ず
`lib/jst.js` を通し、基準時刻は `moment()` ではなく `build_info.updated`
（ビルド時刻）を使う。

この不具合はローカル（JST でビルド → JST で表示）では再現しない。検証は
`TZ=UTC yarn build:skip` でビルドしてから、`dist` を配信して**全ページを
ブラウザで開く**こと（トップだけ見て `/new/` を見落とした前例がある）。

## 生成物とデータ

- `static/downloads/`（RSS・カバー画像・`build_info.json` 約3MB）は `yarn prebuild`
  が生成する。gitignore 対象。ページはこれをビルド時に import するので、無いと
  中身のないサイトになる
- `yarn build` は npm のライフサイクルで `prebuild` を自動実行する。飛ばすなら
  `yarn build:skip`
- `data/added-at.json`（番組の登録日）と `data/apple-podcasts.json`（Apple Podcasts の
  リンク）は GitHub Actions が生成する。手で編集するのは後者の `"source": "manual"`
  の項目だけ
- フィードのエラーや警告への対処は `.claude/skills/feed-triage/` にまとめてある

## 依存関係

Node は `.node-version` の 20.11.0 に固定。Nuxt 2 と古い依存があるため上げない。
新しい Node が要るツール（`npx skills` など）は `NODENV_VERSION=24.16.0` を付けて
その場だけ切り替える。
