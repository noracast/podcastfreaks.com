import { readFileSync } from 'fs'

// 説明文を package.json から借りている。ESM で JSON を import するには
// import attributes が要るので、ここは fs で読む
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineNuxtConfig({
  // Nuxt 4 の既定では app/ 配下を見るが、このプロジェクトは pages/ や
  // components/ をルート直下に置いたままにしてある。lib/ や scripts/ を
  // ページ側とフィード取得側で共有しているので、片方だけ app/ へ移すと
  // import のパスが入り組む
  srcDir: '.',
  dir: {
    // scripts/fetch-feeds.js の出力先（scripts/constants.js）と揃える
    public: 'static'
  },

  // srcDir がルートなので、放っておくと下にあるもの全部を相手にしてしまう。
  //
  // ここに書いたものは Nuxt が一切見なくなる。static/downloads は配信する
  // 中身なので入れてはいけない（入れるとフィードもカバー画像も
  // .output/public へコピーされず、エピソードが読めなくなる）
  ignore: [
    '.output/**',
    'dist/**',
    '_assets/**',
    '**/*.test.js'
  ],

  vite: {
    server: {
      watch: {
        // static/downloads だけで1000ファイルを超える。開発サーバーが
        // これを見張ると EMFILE（開けるファイルの数が足りない）で
        // 再起動を繰り返す。配信はするが、変更は追わなくてよい
        ignored: ['**/static/downloads/**']
      }
    }
  },

  // 各ページを事前レンダリングして HTML として出力する。中身の入った HTML を
  // 返さないと、クローラーやシェア時のプレビューから一覧が見えない
  ssr: true,
  nitro: {
    // Nitro のプリセットを固定する。書かないと Netlify の上では
    // netlify-static が自動で選ばれ、手元（既定の static）と2つ食い違う。
    //
    // - 出力先が .output/public ではなく dist になり、netlify.toml の
    //   publish と合わず「Deploy directory does not exist」で落ちる
    // - _payload.json が出力されない。事前レンダリングした HTML は
    //   これを読む前提なので 404 になり、ハイドレーション後の状態が
    //   復元されない（一覧のチェックが全部外れ、Download OPML が
    //   押せなくなる）。警告は何も出ないので気づきにくい
    //
    // netlify-static が足す _headers（キャッシュ指定）と _redirects の
    // 404 フォールバックは失うが、必要なら static/ に自分で置ける
    preset: 'static',
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
        // maximum-scale=1 は、iOS がダブルタップを拡大と解釈するのを止めるため。
        // 一覧の行やエピソードを続けて押すと拡大してしまっていた。
        // touch-action: manipulation も敷いているが、それだけでは効かなかった。
        // iOS 10 以降は、この指定でもユーザーのピンチ操作そのものは効く
        { name: 'viewport', content: 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1' },
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
        { name: 'twitter:image', content: 'https://podcastfreaks.com/img/share.png' },
        // ホーム画面から開いたときに Safari の枠を出さない（iOS）
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Podcast Freaks' },
        { name: 'theme-color', content: '#8a00f0' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/img/favicon.ico' },
        // iOS がホーム画面に置くときに使う絵。透過のままだと黒く塗られるので、
        // pnpm icons が背景を白で埋めたものを作っている
        { rel: 'apple-touch-icon', href: '/img/icons/apple-touch-icon.png', sizes: '180x180' }
      ]
    }
  },

  css: ['~/assets/common.css'],

  modules: ['@vite-pwa/nuxt'],

  pwa: {
    // 新しい版が出ていたら黙って入れ替える。
    //
    // 既定の 'prompt' は、新しい Service Worker を待機させたまま古いものを
    // 使い続ける。このサイトは毎日中身が変わるので、更新を尋ねる意味がない。
    // Nuxt 2 の @nuxtjs/pwa も skipWaiting: true で同じ振る舞いだった
    registerType: 'autoUpdate',

    workbox: {
      // 前の版のキャッシュを残さない。ローカルで別のビルドを配信したときに
      // 古い HTML が返り続けて何度も混乱した
      cleanupOutdatedCaches: true,
      // 事前レンダリングしたページと、その素材
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      // フィードのデータ（downloads/）は毎日変わるうえ量が多いので、
      // 先読みの対象から外す。エピソードは開いたときに取りに行く
      globIgnores: ['**/downloads/**'],
      navigateFallback: null
    },

    // 開発サーバーでは Service Worker を動かさない。
    // 直したそばから古い画面が返ると、原因を追いにくい
    devOptions: {
      enabled: false
    },

    manifest: {
      name: 'Podcast Freaks',
      short_name: 'P/F',
      description: 'Japanese techie podcast archive',
      lang: 'ja',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      // ヘッダーの紫。iOS でホーム画面から開いたときの上下の色になる
      theme_color: '#8a00f0',
      // pnpm icons が static/icon.png から作る。
      // @nuxtjs/pwa はビルドのたびに生成していたが、@vite-pwa/nuxt は
      // 作らないので、こちらで用意して並べる
      icons: [
        { src: '/img/icons/icon-64.png', sizes: '64x64', type: 'image/png' },
        { src: '/img/icons/icon-120.png', sizes: '120x120', type: 'image/png' },
        { src: '/img/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
        { src: '/img/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
        { src: '/img/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/img/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
        { src: '/img/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    }
  },

  // スタイルは CSS のネスト記法で書いてある。Nuxt 2 のときは
  // postcss-preset-env の nesting-rules で平坦なセレクタへ展開していたが、
  // Vite は自前でネストを展開するので指定が要らなくなった
  // （postcss-preset-env は Nuxt 4 に同梱されていない）

  compatibilityDate: '2025-01-01'
})
