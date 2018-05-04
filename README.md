# Getting started

## Local Development

```sh
npm i
npm run pregenerate # download rss feeds into static/
npm run dev
```

## Deploy

```sh
git clone git@github.com:developersjp/podcast-freaks.git -b gh-pages dist
npm run generate:gh-pages
npm run deploy
```

## Daily Deployment

This project is hosted on Travis CI. With its 'Cron Jobs', all rss will updates on travis and push to 'gh-pages' branch of this project.