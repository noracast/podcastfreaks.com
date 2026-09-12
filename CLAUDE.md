# CLAUDE.md

セットアップとデプロイのコマンドは README.md を参照。

## 日付の扱い

Netlify のビルドは **UTC** で走る。事前レンダリングした結果と閲覧者のブラウザでの
再計算が食い違うとハイドレーションが壊れるため、日付の判定・表示は必ず
`lib/jst.js` を通し、基準時刻は `new Date()` ではなく `build_info.updated`
（ビルド時刻）を使う。

この不具合はローカル（JST でビルド → JST で表示）では再現しない。検証は
`TZ=UTC pnpm build:skip` でビルドしてから、`.output/public` を配信して
**全ページをブラウザで開く**こと（トップだけ見て `/episodes/` を見落とした前例がある）。

日付ライブラリは dayjs。ロケールは `lib/jst.js` で `ja` に決めている。
Vite は使うものだけを読むため、ここを通さないと曜日が英語になる。
ロケールは副作用だけの import（`import 'dayjs/locale/ja'`）では効かず、
値として読んで `dayjs.locale(ja)` に渡す必要がある。

`scripts/` 側（フィードの取得）は素の `Date` で日付を扱う。RSS の pubDate は
`scripts/parse-pub-date.js`、収録時間の計算は `lib/format-seconds.js`。

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

フィードに `itunes:block` / `podcast:block` が指定された番組は `scripts/fetch-feeds.js` が
一覧から外し、`/errors` に「掲載を止めている番組」として出す。

## 生成物とデータ

- `static/downloads/`（RSS・カバー画像・`build_info.json`・`episodes/`）は
  `pnpm fetch-feeds` が生成する。gitignore 対象。ページは `build_info.json` を
  ビルド時に import するので、無いと中身のないサイトになる
- `static/registered.json` も `pnpm fetch-feeds` が `data/rss.json` から作る
  （gitignore 対象）。`/request` が「もう登録されている番組か」を判定するためだけの
  軽い一覧で、キー・フィード・番組名しか持たない。`build_info.json` は一覧の
  初期表示に載るサイズなので、判定のために読ませない
- エピソードは `build_info.json` ではなく `episodes/<key>.json` に番組ごとに
  置く。一覧で行を開いたときにしか使わないのに、`build_info.json` 全体の9割を
  占めていたため。一覧は行を開いた時点でその番組のぶんだけ読む
  （`pages/index.vue` の `loadEpisodes`）ので、`build_info.json` に何かを
  足すときは初期表示に載るかどうかを見る
- エピソードは1番組で1300話を超えることがある。一覧は30話ずつ描き、
  音声は再生を押すまで作らない（`components/episode-player.vue` の
  `preparePlayer`）。長さはフィードの `itunes:duration` から出している
- `pnpm build` は `fetch-feeds`（フィードとカバー画像の取得）から走る。取得済みの
  ものを使うなら `pnpm build:skip`。pnpm は npm のライフサイクル（`pre` の付く
  スクリプト）を既定で実行しないので、`build` の中で明示的に呼んでいる
- `data/added-at.json`（番組の登録日）と `data/apple-podcasts.json`（Apple Podcasts の
  リンク）は GitHub Actions が生成する。手で編集するのは後者の `"source": "manual"`
  の項目だけ
- フィードのエラーや警告への対処は `.claude/skills/feed-triage/` にまとめてある
- 番組を新しく登録する手順は `.claude/skills/add-channel/` にまとめてある

## テスト

`lib/` と `scripts/` の素の関数を Vitest で固めてある。

```sh
pnpm test        # 一度だけ走らせる
pnpm test:watch  # 直しながら見る
```

見ているのは、壊れると影響が大きくて、目で確かめるのが面倒なところ。

- `lib/compare.js` … 一覧の並べ替え。vue-tables-2 から自前の table へ移した
  ときに、234行の並びが1つも変わらないことを確かめながら移植した部分。
  同じ値でも 0 を返さない（Array#sort の作法から外れる）挙動も、
  そのままであることを確かめている
- `lib/jst.js` … 日本時間への固定。テストは `TZ=UTC` で走る
  （`vitest.config.js`）。手元が JST でも気づけるように
- `scripts/parse-pub-date.js` … RSS の pubDate。GMT のような名前の
  タイムゾーン、実際と食い違う曜日など、過去に踏んだ形をそのまま置いてある
- `scripts/pf-util.js` … 収録時間と更新頻度の集計。moment を外したときに、
  配信中の234フィードで旧実装と突き合わせながら書き換えた部分

画面の描画（一覧の絞り込みや子行の開け閉め）はここでは見ていない。
そちらを変えたときは、ブラウザで実際に動かして確かめる。

## スタイル

スタイルはプレーン CSS のネスト記法で書く（`.vue` の `<style>` と
`assets/common.css`）。Sass は使っていない。

ネストは Vite がビルド時に平坦なセレクタへ展開する（Nuxt 2 のときは
`postcss-preset-env` の `nesting-rules` を有効にしていた）。書くときの注意が3つ。

- ネストの中で**要素名から始まるセレクタには `&` を付ける**（`& svg`）。
  付けないとプロパティ名と解釈されて壊れる
- **`@media` の直下では `&` を付けない**。そこでの `&` は `:root` を指すので、
  `:root div.row` という別物のセレクタになる
- **`>` で始まるセレクタには要素かクラスを書く**（`>.badge`、`& > table`）。
  `>*` や `>:first-child` のように書くと、Vue 3 の scoped 変換が
  `[data-v-x]` を別の位置に差し込み、`.links [data-v-x]>:not(:first-child)`
  のような別物のセレクタになる（アイコンの間隔と About の凡例が崩れた）

ヘッダーなどの紫のグラデーションは、もとは Sass のミックスインだった。
`assets/common.css` の `:root` に `--brand-texture` などとして置いてある。

## 例示に使う名前

画面に出す例（placeholder など）は自分たちのもので統一する。番組は `noracast`
（フィードは `https://noracast.jp/feed.xml`、X は `@noracast_`、ハッシュタグは
`#noracast`）。人は X が `@naokazu_terada`、GitHub が `naokazuterada`
（**アンダースコアの有無が違う**）。

他所の番組を例に出すと、その番組のフィードやアカウントが変わったときに、
こちらの画面だけ古い情報を出し続けることになる。

## 依存関係

Nuxt 4 / Vue 3 / Vite。Node は `.node-version` に固定。

パッケージマネージャは pnpm で、バージョンは `package.json` の
`packageManager` に書いてある（corepack が読む）。宣言していない依存が
見えないので、`package.json` に無いものを import していると気づける
（yarn のときは `axios` が `@nuxtjs/axios` 経由で使えてしまっていた）。

pnpm 10 以降は、入れたパッケージのビルドスクリプトを既定で走らせない。
esbuild（Vite のビルド）と sharp（カバー画像とアイコン）は必要なので、
`pnpm-workspace.yaml` の `allowBuilds` で許可している。ここに無いものが
必要になると `ERR_PNPM_IGNORED_BUILDS` で止まる。

pnpm の設定は `package.json` の `pnpm` フィールドではなく
`pnpm-workspace.yaml` に置く（pnpm 10 以降。単一のパッケージでも同じ）。

出力先は `.output/public`。`netlify.toml` の `publish` と `pnpm deploy` の
`--dir` もそこを指している。

そのために `nuxt.config.js` で Nitro のプリセットを `static` に固定している。
外すと Netlify の上だけ `netlify-static` が自動で選ばれ、手元と2つ食い違う。

- 出力先が `dist` に変わり、`netlify.toml` の `publish` と合わずデプロイが落ちる
- `_payload.json` が出力されない。事前レンダリングした HTML はこれを読む前提
  なので 404 になり、ハイドレーション後の状態が復元されない（一覧のチェックが
  全部外れ、Download OPML が押せなくなる）。**警告もエラーも出ない**

手元で Netlify と同じ条件を試すなら `NETLIFY=true pnpm build:skip` で再現できる。

## Netlify のビルドが手元と違う結果になるとき

まずログの冒頭にある `Starting to download cache of ... (Last modified: ...)` を
見る。Netlify は `node_modules` を丸ごとキャッシュして復元するため、**古い
パッケージマネージャが置いたディレクトリが残り続ける**。

yarn から pnpm へ移したとき、これで3回デプロイに失敗した。pnpm は
`node_modules/.pnpm` の下に実体を置き、`package.json` に書いた依存だけを
そこへリンクする。`vue` のように**直接の依存でないもの**は触らないので、
yarn 時代の `node_modules/vue`（Vue 2.7）がそのまま残り、Vite がそちらを
解決して `"createApp" is not exported by node_modules/vue/dist/vue.runtime.esm.js`
で止まっていた。ログのパスに `.pnpm/` が無いものは、pnpm が入れたものでは
ないと判断できる。

直すには Netlify の UI から `Trigger deploy` ▾ → `Clear cache and deploy site`。
ただし**クリアが効くのはその1回だけで、失敗したビルドは新しいキャッシュを
保存しない**。途中で別の理由で落ちると古いキャッシュが生き残り、「クリアした
のに直らない」ように見える。最後まで通るビルドを1回成功させる必要がある。

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
