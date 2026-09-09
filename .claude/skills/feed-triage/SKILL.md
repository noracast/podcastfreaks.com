---
name: feed-triage
description: podcastfreaks.com で「サイトの状態」issue が立ったとき、または /errors にエラーや警告が出たときに、原因を調べて直す。フィードが取得できない、音声を持たない、ドメインが第三者に取得された、といった番組の扱いを決める。「フィードのエラー」「番組が取得できない」「site-health の issue」「rss-inactive へ移す」時に使用。
---

# フィードの不具合を調べて直す

毎日のビルドで問題が見つかると `site-health` ラベルの issue が立つ。この手順で1件ずつ片付ける。

## 前提

| 場所 | 中身 |
|---|---|
| `data/rss.json` | 登録中の番組（フィードURL・Twitter・ハッシュタグ） |
| `data/rss-inactive.json` | 登録解除した番組。**理由を必ず添える** |
| `data/added-at.json` | 登録日。GitHub Actions が git 履歴から生成する。手で編集しない |
| `https://podcastfreaks.com/errors/` | 直近のビルドのエラーと警告 |
| `static/downloads/rss/<key>.rss` | 取得済みのフィード（`yarn prebuild` 後） |

## 1. 症状を確かめる

issue の本文に番組のキーが並んでいる。まず実際のフィードを見る。

```sh
curl -sL "$(node -e "console.log(require('./data/rss.json')['<key>'].feed)")" | head -c 2000
```

見るところは3つ。

- `<title>` が登録している番組と一致するか
- `<item>`（または `<entry>`）があるか
- `<enclosure url="...">` があるか

## 2. 症状ごとの対処

### フィードが取得できない（`wget` / `getaddrinfo ENOTFOUND` / 404 / `EPROTO`）

ドメインが失効しているか、配信元を移行した可能性が高い。**失効と決めつける前に、まずドメインが生きているか確かめる。**

```sh
# HTTP で叩く。移行していればリダイレクト先に配信元が出る
curl -sI --max-time 20 http://<ドメイン>/ | head

# 名前が引けるか（サンドボックスでは dig が通らないので DNS over HTTPS を使う）
curl -s -H 'accept: application/dns-json' "https://dns.google/resolve?name=<ドメイン>&type=A"
```

`prototype-fm` は HTTPS だと `EPROTO: tlsv1 alert internal error` で全滅していたが、**HTTP で叩くと Acast へ301していた**（ 20fe9bf ）。HTTPS のリダイレクタだけが壊れている状態で、ドメインは生きていた。TLS エラーを見てすぐ登録解除しない。

移行先が分からなければ、次を試す。

1. 番組の公式サイトや X を見て、移行先のフィードを探す
2. Apple Podcasts に登録があれば、そこから正しいフィードを辿れることがある

```sh
curl -s "https://itunes.apple.com/search?media=podcast&country=JP&limit=10&term=<番組名>" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>JSON.parse(d).results.forEach(r=>console.log(r.collectionName,'|',r.feedUrl)))"
```

3. 移行先が見つかれば `data/rss.json` のフィードURLを差し替える
4. 見つからなければ登録解除（下記）

### 音声を持たない（`podcastCheck` の警告）

2通りある。**どちらかを見極めてから直す**。

- **記事用のフィードを登録している** — エピソードのタイトルが番組の内容と合っている場合。上と同じ方法で正しいフィード（多くは `/feed/podcast` や FeedBurner）を探して差し替える
- **ドメインが第三者に取得された** — `<title>` が全く別のサイトになっている場合。すぐ登録解除する。`kumocast` はアダルトサイトのフィードに変わっていた（ 4712f66 ）

### `No episodes found`

フィードは取得できるがエピソードが無い。一時的な場合もあるので、**まず数日様子を見る**。続くようなら、番組が終わったのか、配信元を移して古いフィードが空になったのかを見分ける。

- **終わった** — Apple のページが404になっていれば、ほぼ終了。`nanashisan-no-podcast` は中身が空（1765バイト）で Apple も404だった（ 20fe9bf ）
- **移行した** — 上と同じ手順で移行先を探す。`sansan-tech-podcast` は SoundCloud のフィードが空になり、Anchor へ移っていた（ 20fe9bf ）

**移行先を見つけたら、同じ番組かどうかを必ず裏取りする。番組名で判断しない**（改名していることがある。「Sansan Tech Podcast」→「Sansan Tech Radio」）。最新エピソードのタイトルが一致するかで確かめるのが確実。

```sh
# ユーザーから Spotify のURLをもらった場合、oEmbed で最新エピソードのタイトルが取れる
curl -s "https://open.spotify.com/oembed?url=<Spotify のURL>" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).title))"
```

## 3. 直し方

### フィードURLを差し替える

`data/rss.json` の該当キーの `feed` を書き換えて、重複していないか確かめる。

```sh
yarn validate
```

### 登録解除する

`data/rss.json` から消すだけでなく、**理由を添えて** `data/rss-inactive.json` へ移す（README の方針）。

```json
"<key>": {
  "feed": "...",
  "twitter": "...",
  "hashtag": "...",
  "reason": "domain revocation"
}
```

`reason` は既存の値に揃える。`feed not found` / `domain revocation` / `end of broadcast` / `website is closed` / `domain moved`。

そのあと登録日を同期する。

```sh
yarn added-at
```

## 4. 確認する

```sh
yarn validate                 # 重複がないか
yarn prebuild                 # 実際に取得できるか（数分かかる。ネットワークが要る）
```

`yarn prebuild` を最後まで通せない環境では、`data/` の変更だけコミットして、次の日次ビルドの結果を `/errors` で確認する。

## 5. コミットする

コミットメッセージは日本語で、**何が起きていたか**を書く。番組を外す判断をした場合は、その根拠（フィードの中身がどう変わっていたか）を残す。

## 注意

- `static/downloads/` は生成物。gitignore 対象なのでコミットしない
- `data/added-at.json` と `data/apple-podcasts.json` は Actions が管理する。手で書くのは `apple-podcasts.json` の `"source": "manual"` の項目だけ
- 番組を外すと Frequency や登録日のデータからも消える。次の Actions 実行で自動的に揃う
