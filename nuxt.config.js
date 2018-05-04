var _ = require('lodash')

var conf = {
  head: {
    titleTemplate: 'Podcast Freaks',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Meta description' }
    ],
    link: [
      { type: 'text/css', rel: 'stylesheet', href: '//cdn.jsdelivr.net/cal-heatmap/3.3.10/cal-heatmap.css' },
      { type: 'text/css', rel: 'stylesheet', href: '//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.min.css' }
    ]
  }
}

if(process.env.DEPLOY_ENV === 'GH_PAGES'){
  const additional = {
    router: {
      base: '/podcast-freaks/'
    },
    modules: [
      ['@nuxtjs/google-analytics', {
        id: 'UA-117929880-2'
      }]
     ]
  }
  conf = _.merge(conf, additional)
}

module.exports = conf