const pkg = require('./package')

module.exports = {
  mode: 'universal',

  /*
  ** Headers of the page
  */
  head: {
    htmlAttrs: {
      lang: 'ja'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description },

      { hid: 'description', name: 'description', content: pkg.description },
      { hid: 'og:site_name', property: 'og:site_name', content: 'Podcast Freaks' },
      { hid: 'og:type', property: 'og:type', content: 'website' },
      { hid: 'og:url', property: 'og:url', content: 'https://podcastfreaks.com' },
      { hid: 'og:title', property: 'og:title', content: 'Podcast Freaks' },
      { hid: 'og:description', property: 'og:description', content: pkg.description },
      { hid: 'og:image', property: 'og:image', content: 'https://podcastfreaks.com/img/share.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Podcast Freaks' },
      { name: 'twitter:description', content: pkg.description },
      { name: 'twitter:image', content: 'https://podcastfreaks.com/img/share.png' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/img/favicon.ico' },
      { rel: 'apple-touch-icon', type: 'image/x-icon', href: '/img/apple-touch-icon-120.png', size: '120x120' },
      { rel: 'apple-touch-icon', type: 'image/x-icon', href: '/img/apple-touch-icon-152.png', size: '152x152' }
    ]
  },

  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#fff' },

  /*
  ** Global CSS
  */
  css: [
    '~/assets/common'
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    '~/plugins/filters',
    '~/plugins/vue-clipboard2',
    '~/plugins/vue-responsive-components',
    '~/plugins/vue-table-2'
  ],

  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://github.com/nuxt-community/axios-module#usage
    '@nuxtjs/axios',
    ['@nuxtjs/google-analytics', { id: 'UA-126960237-2' }],
    '@nuxtjs/pwa',
  ],
  // PWAのマニフェスト
  manifest: {
    name: 'Podcast Freaks',
    short_name: 'P/F',
    description:"Japanese techie podcast archive"
    lang: 'ja',
    start_url: '/',
    display: 'standalone'
  },
  /*
  ** Axios module configuration
  */
  axios: {
    // See https://github.com/nuxt-community/axios-module#options
  },

  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend(config, ctx) {
      // Run ESLint on save
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    },
    transpile: ['vue-responsive-components']
  }
}
