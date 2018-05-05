# Getting started

## Local Development

```sh
npm i
npm run pregenerate # download rss feeds etc. into /static/downloads
npm run dev
```

# Daily Deployment

This project is hosted on [Travis CI](https://travis-ci.org/developersjp/podcast-freaks). With its 'Cron Jobs', all rss seems to be updated on travis and pushed to 'gh-pages' branch of this project.