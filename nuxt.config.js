const pkg = require('./package')

module.exports = {
  // 各ページを事前レンダリングして HTML として出力する（フルスタティック）。
  // 以前は mode: 'universal' と nuxt generate --spa の組み合わせで、
  // 中身が空の HTML と 200.html のフォールバックだけを返していたため、
  // クローラーやシェア時のプレビューから一覧の中身が見えていなかった。
  // ssr は target: 'static' の既定（true）に任せる
  target: 'static',

  env: {
    TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY,
    TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET,
    TWITTER_ACCESS_TOKEN_KEY: process.env.TWITTER_ACCESS_TOKEN_KEY,
    TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    TWITTER_LANG: process.env.TWITTER_LANG
  },

  /*
  ** Headers of the page
  */
  head: {
    htmlAttrs: {
      lang: 'ja'
    },
    // referrer の meta は置かない。ブラウザ既定（strict-origin-when-cross-origin）の
    // ままなら、音声を再生したときに配信元のログへ podcastfreaks.com が残る。
    // no-referrer などを足すと、配信者側の「どこから聴かれたか」が消える
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
    '@/assets/common.css'
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    '@/plugins/components',
    '@/plugins/filters',
    '@/plugins/gtag.client',
    '@/plugins/vue-clipboard2',
    '@/plugins/vue-highlightjs',
    '@/plugins/vue-table-2'
  ],

  /*
  ** Nuxt.js modules
  */
  modules: [
    '@nuxtjs/dotenv',
    '@nuxtjs/pwa',
  ],
  // PWAのマニフェスト
  manifest: {
    name: 'Podcast Freaks',
    short_name: 'P/F',
    description: 'Japanese techie podcast archive',
    lang: 'ja',
    start_url: '/',
    display: 'standalone'
  },
  /*
  ** Build configuration
  */
  build: {
    postcss: {
      postcssOptions: {
        plugins: {
          // スタイルは CSS のネスト記法で書いてある。ネストに対応していない
          // ブラウザのために、ビルド時に平坦なセレクタへ展開しておく。
          // postcss-preset-env は Nuxt が既定で通しているので、
          // 依存を足さずにこの機能だけ有効にできる
          'postcss-preset-env': {
            features: { 'nesting-rules': true }
          }
        }
      }
    },
    /*
    ** You can extend webpack config here
    */
    extend(config) {
      config.performance.hints = false
    }
  }
}
