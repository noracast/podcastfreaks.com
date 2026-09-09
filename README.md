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
