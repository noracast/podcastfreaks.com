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

## 音声の再生

音声は配信元の enclosure URL をブラウザから直接再生している
（`components/episode-player.vue` の `preparePlayer`）。配信者側の計測は配信
サーバーのログを IP と UA で数えるので、この形なら再生がそのまま各番組の
統計になる。次のことをすると、その数字を奪ってしまうのでしない。

- 音声を中継する・キャッシュする（配信元のログが Netlify の IP で埋まる）
- enclosure URL を「正規化」してプレフィックスやクエリを落とす
  （Podtrac などの計測が効かなくなる。`scripts/pf-util.js` の `audioUrl`）
- ファイルの保存（ダウンロード）機能を付ける
- 再生時の UA を偽装する。ブラウザからは変えられないし、変えるべきでもない
  （フィード取得側の UA は `scripts/wget-with-timeout.js` で名乗っている）
- `referrer` の meta を足す。既定のままなら配信元へ podcastfreaks.com が伝わる

フィードに `itunes:block` / `podcast:block` が指定された番組は `prebuild.js` が
一覧から外し、`/errors` に「掲載を止めている番組」として出す。

## 生成物とデータ

- `static/downloads/`（RSS・カバー画像・`build_info.json`・`episodes/`）は
  `yarn prebuild` が生成する。gitignore 対象。ページは `build_info.json` を
  ビルド時に import するので、無いと中身のないサイトになる
- エピソードは `build_info.json` ではなく `episodes/<key>.json` に番組ごとに
  置く。一覧で行を開いたときにしか使わないのに、`build_info.json` 全体の9割を
  占めていたため。一覧は行を開いた時点でその番組のぶんだけ読む
  （`pages/index.vue` の `loadEpisodes`）ので、`build_info.json` に何かを
  足すときは初期表示に載るかどうかを見る
- エピソードは1番組で1300話を超えることがある。一覧は30話ずつ描き、
  音声は再生を押すまで作らない（`components/episode-player.vue` の
  `preparePlayer`）。長さはフィードの `itunes:duration` から出している
- `yarn build` は npm のライフサイクルで `prebuild` を自動実行する。飛ばすなら
  `yarn build:skip`
- `data/added-at.json`（番組の登録日）と `data/apple-podcasts.json`（Apple Podcasts の
  リンク）は GitHub Actions が生成する。手で編集するのは後者の `"source": "manual"`
  の項目だけ
- フィードのエラーや警告への対処は `.claude/skills/feed-triage/` にまとめてある
- 番組を新しく登録する手順は `.claude/skills/add-channel/` にまとめてある

## 依存関係

Node は `.node-version` の 20.11.0 に固定。Nuxt 2 と古い依存があるため上げない。
新しい Node が要るツール（`npx skills` など）は `NODENV_VERSION=24.16.0` を付けて
その場だけ切り替える。

## コミットメッセージをファイルで渡すとき

`git commit -F` に渡すファイルは、`$TMPDIR/msg.txt` のような汎用名にしない。
zsh は noclobber が効いていて、同名のファイルが残っていると `cat > file` が
`file exists` で失敗する。それでも後続の `git commit -F` は成功してしまうため、
**別セッションが残した古いメッセージでコミットされる**（前例あり）。

固有の名前を付けて、`>|` で上書きする。

```sh
cat >| "$TMPDIR/pf-<内容>-msg.txt" <<'MSG'
...
MSG
```
