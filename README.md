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

# Daily Deployment

This project is hosted on [Travis CI](https://travis-ci.org/developersjp/podcast-freaks). With its 'Cron Jobs', all rss seems to be updated on travis and pushed to 'gh-pages' branch of this project.