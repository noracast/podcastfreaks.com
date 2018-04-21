# Getting started

## Local Development

```sh
npm i
npm pregenerate # download rss feeds into static/
npm dev
```

## Deploy

```sh
g clone git@github.com:developersjp/podcast-freaks.git -b gh-pages dist
npm generate:gh-pages
npm deploy
```