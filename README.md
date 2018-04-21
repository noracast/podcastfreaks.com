# Getting started

## Local Development

```sh
npm i
npm run pregenerate # download rss feeds into static/
npm run dev
```

## Deploy

```sh
g clone git@github.com:developersjp/podcast-freaks.git -b gh-pages dist
npm run generate:gh-pages
npm run deploy
```