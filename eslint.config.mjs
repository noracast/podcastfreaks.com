// ESLint の設定。eslintrc 形式から flat config に移した。
//
// 以前は nuxt.config.js の build.extend で eslint-loader を挟み、開発サーバーの
// 保存時にも lint していた。eslint-loader は廃止されているので外し、lint は
// yarn lint に一本化する。
//
// package.json に "type" を置いていないので、この設定は .mjs にして
// import で書く（.js のままだと CommonJS として読まれる）。

import pluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['dist/', '.nuxt/', 'static/downloads*/']
  },

  // Vue 2 向けのプリセット。3 系のものを当てると、このプロジェクトでは
  // まだ使えない書き方を促されてしまう
  ...pluginVue.configs['flat/vue2-recommended'],

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module'
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

      // 使わなくなった import が溜まっていた（ヒートマップを消したとき、
      // 4ファイルで import だけが残っているのが見つかった）。
      // 引数は Vue のフックなどで受け取るだけのものがあるので見ない
      'no-unused-vars': ['warn', { args: 'none' }],

      // Nuxt はファイル名がそのままページ名になるので、pages/index.vue や
      // layouts/default.vue のような1単語は避けられない
      'vue/multi-word-component-names': 'off',

      // このプロジェクトは template → style → script の順で書いてある。
      // 既定（script が style の上）とは違うので、こちらを正とする
      'vue/block-order': ['warn', { order: ['template', 'style', 'script'] }],

      // Nuxt の head() は Vue 標準のプロパティ順に位置が決まっておらず、
      // 既定では computed や methods より上へ動かすよう促される。
      // 並べ替えても読みやすくならないので見ない
      'vue/order-in-components': 'off',

      // コンポーネント名はテンプレートでの書き方に揃えてケバブケースにしている
      // （a-blank, episode-row など）。既定は PascalCase
      'vue/component-definition-name-casing': ['warn', 'kebab-case'],

      // テンプレートは pug から移したもので、属性を1行に並べて書いてある。
      // 既定（1行に書くなら属性は1つまで）に合わせると、svg の path のような
      // 短い要素まで縦に割れて、かえって読みにくい
      'vue/max-attributes-per-line': 'off',

      // <button>{{ buttonText }}</button> のような短いものを3行に割らない
      'vue/singleline-html-element-content-newline': 'off'
    }
  }
]
