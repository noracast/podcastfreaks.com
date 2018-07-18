var conf = {
  build: {
    vendor: ['element-ui','vuejs-heatmap']
  },
  css: [
    'element-ui/lib/theme-chalk/index.css'
  ],
  head: {
    titleTemplate: 'Podcast Freaks',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '日本語のテック系ポッドキャストの更新情報をまとめています' }
    ],
    link: [
      { type: 'text/css', rel: 'stylesheet', href: '//cdn.jsdelivr.net/cal-heatmap/3.3.10/cal-heatmap.css' }
    ]
  },
  modules: [
    ['@nuxtjs/google-analytics', {id: 'UA-117929880-2'}]
  ],
  plugins: [
    '~plugins/filters.js',
    '~plugins/element-ui',
    '~plugins/vuejs-heatmap'
  ],
  generate: {
    fallback: true
  }
}

module.exports = conf