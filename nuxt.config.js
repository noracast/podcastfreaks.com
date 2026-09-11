import { readFileSync } from 'fs'

// 説明文を package.json から借りている。ESM で JSON を import するには
// import attributes が要るので、ここは fs で読む
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineNuxtConfig({
  // Nuxt 4 の既定では app/ 配下を見るが、このプロジェクトは pages/ や
  // components/ をルート直下に置いたままにしてある。lib/ や scripts/ を
  // ページ側と prebuild 側で共有しているので、片方だけ app/ へ移すと
  // import のパスが入り組む
  srcDir: '.',
  dir: {
    // prebuild.js の出力先（scripts/constants.js）と揃える
    public: 'static'
  },

  // 各ページを事前レンダリングして HTML として出力する。中身の入った HTML を
  // 返さないと、クローラーやシェア時のプレビューから一覧が見えない
  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  },

  app: {
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
        { name: 'description', content: pkg.description },
        { property: 'og:site_name', content: 'Podcast Freaks' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://podcastfreaks.com' },
        { property: 'og:title', content: 'Podcast Freaks' },
        { property: 'og:description', content: pkg.description },
        { property: 'og:image', content: 'https://podcastfreaks.com/img/share.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Podcast Freaks' },
        { name: 'twitter:description', content: pkg.description },
        { name: 'twitter:image', content: 'https://podcastfreaks.com/img/share.png' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/img/favicon.ico' },
        { rel: 'apple-touch-icon', type: 'image/x-icon', href: '/img/apple-touch-icon-120.png', sizes: '120x120' },
        { rel: 'apple-touch-icon', type: 'image/x-icon', href: '/img/apple-touch-icon-152.png', sizes: '152x152' }
      ]
    }
  },

  css: ['~/assets/common.css'],

  modules: ['@vite-pwa/nuxt'],

  pwa: {
    manifest: {
      name: 'Podcast Freaks',
      short_name: 'P/F',
      description: 'Japanese techie podcast archive',
      lang: 'ja',
      start_url: '/',
      display: 'standalone'
    }
  },

  postcss: {
    plugins: {
      // スタイルは CSS のネスト記法で書いてある。ネストに対応していない
      // ブラウザのために、ビルド時に平坦なセレクタへ展開しておく
      'postcss-preset-env': {
        features: { 'nesting-rules': true }
      }
    }
  },

  compatibilityDate: '2025-01-01'
})
