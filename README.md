# Podcast Freaks

[![Netlify Status](https://api.netlify.com/api/v1/badges/8fefaabc-7813-412d-a1ee-901215b39f14/deploy-status)](https://app.netlify.com/sites/podcastfreaks.com/deploys)

日本語のテック系ポッドキャストのまとめサイトです。

https://podcastfreaks.com/

## はじめかた

```
yarn
yarn prebuild # /static/downloads へフィードとカバー画像を取得する
yarn dev
```

## デプロイ

```sh
yarn build && yarn deploy
```

`prebuild` を実行済みなら

```sh
yarn build:skip && yarn deploy
```

netlify-cli で Netlify へ直接送るなら

```sh
yarn build:skip && yarn deploy:netlify
```

## 依存関係の更新

```sh
yarn ncu
yarn ncu -u
```

## 毎日のビルド

IFTTT から Netlify の Build hooks を叩いて、毎日デプロイしています。

## アクセス解析

Google アナリティクス4（測定ID `G-S5SV74H0TQ`）を `plugins/gtag.client.js` から読み込んでいます。GA4 用の Nuxt 2 モジュールは選択肢が乏しいため、依存を足さずに gtag.js を直接読み込む形です。

ページビューは `gtag('config')` の自動送信を切り、`router.afterEach` から明示的に送っています。Nuxt はハイドレーション時にも初回のルート遷移が走るため、自動送信と併用すると初回が二重に計上されるからです。送信は `<title>` の書き換えを `MutationObserver` で待ってから行います（`afterEach` の直後はまだ前のページのタイトルが入っているため）。

### 自分のアクセスを計測から外す

`?ga-optout=1` を付けて開くと、そのブラウザは計測対象から外れます。解除は `?ga-optout=0` です。

```
https://podcastfreaks.com/?ga-optout=1   除外する
https://podcastfreaks.com/?ga-optout=0   解除する
```

除外中は **gtag.js 自体を読み込みません**（スクリプトタグを作らないので Google への通信が発生しません）。状態は localStorage に持つのでブラウザごとです。

除外中はヘッダーの右端に「計測オフ」と出ます。この印を出す処理と計測をやめる処理は同じ判定から分岐しているため、**印が出ていれば確実に計測されていません**。逆に印が出ていない場合は「計測されている」か「Service Worker が古い版を配信している」かのどちらかなので、確実を期すならスーパーリロードしてから確認してください。localStorage はブラウザごとなので、この印が他の訪問者に見えることはありません。

GA4 の管理画面にも内部トラフィックの除外がありますが、そちらは IP ベースでモバイル回線や外出先では効かないため、ブラウザ単位のこの方式を使っています。

## フォーム

[!] フォームの項目は `static/form.html` と揃える必要があります。

参考: https://qiita.com/hiropy0123/items/2e8d14ea66b78ab64847

---

## Contributing

- `data/rss.json` を差し替えれば、別のポッドキャストのまとめサイトを作れます。
- `data/rss.json` からフィードを外すときは、削除するだけでなく、理由を添えて `data/rss-inactive.json` へ移してください。
- Apple Podcasts へのリンクが出ていない番組があれば、`data/apple-podcasts.json` に足せます。

  ```json
  "backspace": {
    "id": 830709730,
    "url": "https://podcasts.apple.com/jp/podcast/backspace-fm/id830709730",
    "source": "manual"
  }
  ```

  リンクは iTunes の検索APIの結果とフィードURLを突き合わせて自動で集めています。ただし4分の1ほどの番組は、Apple 側に登録されているフィードURLがこのサイトのものと違い（配信元の移行、FeedBurner 経由など）、自動では特定できません。番組名の近さで採用すると別の番組にリンクしてしまうため、確実でないものは出さない方針です。`"source": "manual"` の項目は自動処理では触りません。

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/noracast/podcastfreaks.com)
