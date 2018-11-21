[![Build Status](https://travis-ci.org/noracast/podcast-freaks.svg?branch=master)](https://travis-ci.org/noracast/podcast-freaks)


# Getting started

## Local development

```
yarn
yarn pregenerate # download rss feeds etc. into /static/downloads
yarn dev
```

**Use 'yarn' instead of 'npm' because it will cause problem on travis ci when you use 'npm'.**

Refs:
- https://travis-ci.org/developersjp/podcast-freaks/builds/416706653#L2821
- https://github.com/nuxt/nuxt.js/issues/3039#issuecomment-396904887)

# Daily deployment

This project is hosted on [Travis CI](https://travis-ci.org/developersjp/podcast-freaks). With its 'Cron Jobs', all rss seems to be updated on travis and pushed to 'gh-pages' branch of this project.
