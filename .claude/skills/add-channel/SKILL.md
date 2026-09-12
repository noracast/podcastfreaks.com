---
name: add-channel
description: podcastfreaks.com に番組を新しく登録する。Spotify・Apple Podcasts・YouTube・番組サイトなど「フィードURL以外」しか手元に無い状態から、配信元のRSSを突き止め、ポッドキャストとして妥当かを検証し、`data/rss.json` へ追加する。「この番組を登録して」「フィードを調べて」「番組を追加」「rss.json に足す」「登録リクエストが来た」時に使用。
---

# 番組を登録する

登録依頼は、たいてい **フィードURL以外のURL** で来る。Spotify のリンク、Apple の
リンク、YouTube、番組サイト、番組名だけ。配信元のRSSを突き止めるところが仕事の大半になる。

`feed-triage` が「登録済みの番組が壊れたとき」の手順なのに対し、これは「番組を入れるとき」の手順。

## 前提

| 場所 | 中身 |
|---|---|
| `data/rss.json` | 登録中の番組（キー・フィードURL・Twitter・ハッシュタグ） |
| `data/rss-inactive.json` | 登録解除した番組。**過去に外した番組を再登録しないよう必ず見る** |
| `data/added-at.json` | 登録日。GitHub Actions が git 履歴から生成する。**手で編集しない** |
| `data/apple-podcasts.json` | Apple のリンク。Actions が生成する。**手で編集しない**（例外は `"source": "manual"`） |

`rss.json` に足すだけでよい。登録日と Apple のリンクは、コミットを push すれば
Actions が勝手に付ける。

## 1. 番組名を特定する

フィードを探すには、まず正確な番組名が要る。

### Spotify のリンクの場合

**oEmbed（`open.spotify.com/oembed`）が返す `title` は番組名ではない。** 番組のURLを
渡しても、返るのは「最新エピソードのタイトル」。ただし**そのエピソード名から番組へ
辿れる**ので、まずはこれが速い（curl 2回で済む）。

```sh
SHOW_URL="https://open.spotify.com/show/<SHOW_ID>"
TITLE=$(curl -s --max-time 25 "https://open.spotify.com/oembed?url=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$SHOW_URL")" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).title))")
echo "最新エピソード: $TITLE"
# そのエピソードが属する番組を引く（entity=podcastEpisode）
curl -s --max-time 25 "https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&country=JP&limit=5&term=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$TITLE")" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{JSON.parse(d).results.forEach(x=>console.log(x.collectionName,'|',x.feedUrl))})"
```

実例（ムーザルのプログラミング絶望ラジオ。Spotify のURLしか無い状態から）:

```
oEmbed の title    #60 コードを書かないのにプログラマなのか, …
→ エピソード検索   ムーザルのプログラミング絶望ラジオ | https://anchor.fm/s/107747d74/podcast/rss
```

この経路はサイト側の `/add` でも使っている（`lib/spotify.js`・`lib/itunes.js`）。
oEmbed は CORS も通るので、ブラウザからも呼べる。

エピソード検索で見つからないとき（Apple に載っていない番組）は、埋め込みページの
`__NEXT_DATA__` を読む。

```sh
cd "$TMPDIR" && curl -sL --max-time 25 \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36" \
  "https://open.spotify.com/embed/show/<SHOW_ID>" -o sp.html
node -e "
const h=require('fs').readFileSync('$TMPDIR/sp.html','utf8');
const m=h.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
const e=JSON.parse(m[1]).props.pageProps.state.data.entity;
console.log('番組名:', e.subtitle || e.name);
"
```

番組のURLを開いても、埋め込みが返すのは**最新エピソードのオブジェクト**であることが
多い。その場合 `subtitle` に番組名が入る（`name` はエピソード名）。

なお `open.spotify.com/show/<id>` を直接 curl しても og:title は取れない（JS 描画）。

### Apple Podcasts のリンクの場合

URL の `id<数字>` を使って lookup する。フィードURLがそのまま得られる。

```sh
curl -s "https://itunes.apple.com/lookup?id=<ID>&country=JP" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).results[0];console.log(r.collectionName,'|',r.feedUrl)})"
```

### YouTube・番組サイトの場合

ページのタイトルや `<link rel="alternate" type="application/rss+xml">` を見る。
番組サイトなら `/feed`、`/feed/podcast`、`/rss`、`/index.xml`、`/feed.xml` を当たる。

## 2. フィードを探す

番組名が分かったら iTunes の検索API。**Apple に登録されている番組なら、これが一番速くて確実。**

```sh
curl -s --max-time 25 "https://itunes.apple.com/search?media=podcast&country=JP&limit=5&term=$(python3 -c "import urllib.parse;print(urllib.parse.quote('<番組名>'))")" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{JSON.parse(d).results.forEach(x=>console.log(x.collectionName,'|',x.feedUrl,'|',x.trackCount+'話'))})"
```

見つからないときは、番組名を短くする・英字表記に変える・出演者名で引く。
それでも駄目なら番組サイトや配信サービスから直接探す。よくある形:

| 配信元 | フィードの形 |
|---|---|
| Spotify for Podcasters（旧 Anchor） | `https://anchor.fm/s/<hex>/podcast/rss` |
| SoundCloud | `https://feeds.soundcloud.com/users/soundcloud:users:<id>/sounds.rss` |
| LISTEN | `https://listen.style/p/<slug>/rss` |
| note | `https://note.com/<user>/rss` |
| WordPress | `https://<domain>/feed/podcast/` |
| GitHub Pages 系 | `https://<domain>/feed.xml`、`/index.xml` |

**Spotify の show ID からフィードURLは機械的には導けない。** `anchor.fm/s/<hex>` の
hex は Spotify の ID と別物なので、必ずフィード本体か iTunes 経由で確かめる。

## 3. フィードを検証する

**ここを飛ばさない。** #48 は元々「通常記事のフィードを掴んでしまう」ために立った issue で、
実際に記事用フィードを登録したまま（`clfreaks`・`denkiya`）、あるいはドメインを第三者に
取られてアダルトサイトのフィードに化けたまま（`kumocast`）一覧に載っていた前例がある。

```sh
cd "$TMPDIR" && curl -sL --max-time 30 "<FEED_URL>" -o feed.xml
echo "--- 番組名 ---"; grep -o '<title>[^<]*</title>' feed.xml | head -1
echo "--- エピソード数 ---"; grep -c '<item' feed.xml
echo "--- 音声を持つ数 ---"; grep -c '<enclosure' feed.xml
echo "--- 収録時間 ---"; grep -o '<itunes:duration>[^<]*<' feed.xml | head -3
echo "--- block ---"; grep -o '<itunes:block>[^<]*<' feed.xml | head -2
echo "--- カバー画像 ---"; img=$(grep -o '<itunes:image href="[^"]*"' feed.xml | head -1 | sed 's/.*href="//;s/"//'); echo "$img"; curl -sI --max-time 20 "$img" | grep -i '^HTTP'
```

判定:

| 見るところ | 通す条件 |
|---|---|
| `<title>` | 依頼された番組と一致する（別番組を掴んでいないか） |
| `<item>` / `<entry>` | 1件以上ある |
| **`<enclosure>`** | **1件以上ある。0なら記事用フィード。登録しない** |
| `itunes:duration` | `01:14:12` か秒数。0や空だと `/errors` に警告が出る |
| `itunes:block` | **あれば登録しない**（配信者が掲載を拒否している。`prebuild.js` が一覧から外す） |
| カバー画像 | 200 が返る |

`enclosure` が0でも番組自体は実在することが多い（記事用フィードを掴んでいるだけ）。
その場合は諦めず、Apple 側の `feedUrl` など別のフィードを探し直す。

## 4. 重複を調べる

```sh
grep -in "<キー候補>\|<フィードURLの特徴的な部分>" data/rss.json data/rss-inactive.json
```

`rss-inactive.json` に居た場合は `reason` を読む。`end of broadcast`（終了）なら
再登録しない。`feed not found`（配信元の移行でURLが切れていただけ）なら、新しい
フィードURLで `rss.json` へ戻してよい。その際 `rss-inactive.json` からは消す。

## 5. X アカウントとハッシュタグを調べる

どちらも `null` で構わない項目なので、**確証が無ければ埋めない。** 間違ったアカウントを
出す方が害が大きい。

まずフィード本文から拾う。

```sh
grep -o 'twitter\.com/[A-Za-z0-9_]*\|x\.com/[A-Za-z0-9_]*\|#[^< ]\{2,20\}' "$TMPDIR/feed.xml" \
  | sort | uniq -c | sort -rn | head -20
```

出演者個人のアカウントと番組のアカウントが混ざる。**番組のアカウントを優先**する
（出演者個人しか無ければそれを入れている例もある: `CEO.FM` → `@tchikuba`）。
判断が付かなければ web 検索で番組の公式アカウントを確かめる。

ハッシュタグは `#プログラミング` `#エンジニア` のような一般タグを拾ってしまうので注意。
**番組固有のものだけ**入れる（`#backspacefm`、`#電器屋Walker` など）。無ければ `null`。

## 6. キーを決めて追加する

キーは URL やカバー画像のファイル名に使われる。既存に倣う。

- 小文字の英数字とハイフン（`design-fm`、`ai-sakaba`）
- フィードの slug や `itunes:author` に合わせるのが無難（例: `anchor.fm/s/.../podcast/rss` で
  `<link>https://podcasters.spotify.com/pod/show/moozaru</link>` なら `moozaru`）
- 大文字を含む既存キーもあるが（`CEO.FM`、`OSSfm`）、新規は小文字でよい

並びは**キーのアルファベット順**。該当位置に挿入する。

```sh
node -e "
const fs=require('fs');const p='data/rss.json';let s=fs.readFileSync(p,'utf8');
const key='<KEY>';
if(s.includes('\"'+key+'\"')){console.log('already');process.exit(0);}
const ins='  \"'+key+'\": {\n    \"feed\": \"<FEED>\",\n    \"twitter\": <TWITTER>,\n    \"hashtag\": <HASHTAG>\n  },\n';
const anchor='  \"<次のキー>\": {';
fs.writeFileSync(p, s.replace(anchor, ins+anchor));
"
yarn validate
```

`yarn validate` が「重複はありません」と言えばよい。

## 7. 確認してコミットする

フィードを取り直して、一覧に出るところまで見る。

```sh
yarn prebuild && yarn dev
```

`static/downloads/rss/<key>.rss` とカバー画像ができ、トップの一覧に出れば完了。
1番組の追加のために全件取り直すのが重いときは、ここは省いてもよい（`prebuild` は
毎日の Netlify ビルドで必ず走るため、フィードが3の検証を通っていれば結果は同じ）。

コミットは `data/rss.json` だけ。`added-at.json` と `apple-podcasts.json` は
push 後に Actions が更新する。

```
<番組名> を追加する

https://github.com/noracast/podcastfreaks.com/issues/48
```

## 登録しない場合

判断が付かないものを黙って入れない。次は登録を見送り、依頼者にその旨を伝える。

| 状況 | 扱い |
|---|---|
| `itunes:block` / `podcast:block` がある | 配信者が掲載を拒否している。登録しない |
| 音声（`enclosure`）を1つも持たない | 記事用フィードの可能性。正しいフィードが見つかるまで登録しない |
| 日本語のテック系ポッドキャストでない | このサイトの趣旨から外れる |
| `rss-inactive.json` に `end of broadcast` で載っている | 再登録しない |
