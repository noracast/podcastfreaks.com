[![Build Status](https://travis-ci.org/noracast/podcast-freaks.svg?branch=master)](https://travis-ci.org/noracast/podcast-freaks)


# Getting started

## Local development

```
yarn
yarn pregenerate # Download assets into /static/downloads
yarn dev
```

**Use 'yarn' because it will cause problem on travis ci when you use 'npm'.**

Refs:
- https://travis-ci.org/noracast/podcast-freaks/builds/416706653#L2821
- https://github.com/nuxt/nuxt.js/issues/3039#issuecomment-396904887)

# Deployment from local

```sh
yarn build
yarn deploy
```

# Daily deployment

This project is hosted on [Travis CI](https://travis-ci.org/developersjp/podcast-freaks). With its 'Cron Jobs', all rss seems to be updated on travis and pushed to 'gh-pages' branch of this project.

Don't use `yarn deploy` (push-dir) on TravisCI. It will cause `Authentication failed`.


# Forms

[!] You need to align items in form with `static/form.html`

Ref: https://qiita.com/hiropy0123/items/2e8d14ea66b78ab64847
