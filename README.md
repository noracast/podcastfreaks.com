# Podcast Freaks

[![Netlify Status](https://api.netlify.com/api/v1/badges/8fefaabc-7813-412d-a1ee-901215b39f14/deploy-status)](https://app.netlify.com/sites/podcastfreaks.com/deploys)

Podcast Freaks - Japanese techie podcast archive

https://podcastfreaks.com/

## Getting started

```
yarn
yarn prebuild # Download assets into /static/downloads
yarn dev
```

## Deployment

```sh
yarn build && yarn deploy
```
or if you have already execute 'prebuild'

```sh
yarn build:skip && yarn deploy
```

or if you want to push directly to Netlify with netlify-cli

```sh
yarn build:skip && yarn deploy:netlify
```

## Keep dependencies updated

```sh
yarn ncu
yarn ncu -u
```

## Daily build

This project will be deploy daily by calling Netlify's 'Build hooks' from IFTTT.

## Forms

[!] You need to align items in form with `static/form.html`

Ref: https://qiita.com/hiropy0123/items/2e8d14ea66b78ab64847

---

## Contributing

- You can create another podcast archives by replacing `data/rss.json` file yourself.
- If you want remove feeds from `data/rss.json`, not only removing it but also move it into `data/rss-inactive.json` with reason.
- If a podcast has no Apple Podcasts link on the site, you can add it to `data/apple-podcasts.json`:

  ```json
  "backspace": {
    "id": 830709730,
    "url": "https://podcasts.apple.com/jp/podcast/backspace-fm/id830709730",
    "source": "manual"
  }
  ```

  Links are collected automatically by matching the feed URL against the iTunes Search API. About a quarter of the shows are registered on Apple with a different feed URL (host migration, FeedBurner, …), so they cannot be matched — matching by show name instead would link to the wrong podcast. Entries with `"source": "manual"` are never touched by the automation.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/noracast/podcastfreaks.com)
