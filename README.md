# Podcast Freaks

[![Netlify Status](https://api.netlify.com/api/v1/badges/8fefaabc-7813-412d-a1ee-901215b39f14/deploy-status)](https://app.netlify.com/sites/podcastfreaks.com/deploys)

Podcast Freaks - Japanese techie podcast archive

https://podcastfreaks.com/

## Getting started

Create `.env` file on the root directory.

```
TWITTER_CONSUMER_KEY=xxxxxxxx
TWITTER_CONSUMER_SECRET=xxxxxxxx
TWITTER_ACCESS_TOKEN_KEY=xxxxxxxx
TWITTER_ACCESS_TOKEN_SECRET=xxxxxxxx
TWITTER_LANG=ja
```

`TWITTER_LANG` is used for restricting tweets to the given language in hashtag search. You can remove it if you don't want to use it.

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

You can create another podcast archives by replacing `data/rss.json` file yourself.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/noracast/podcastfreaks.com)
