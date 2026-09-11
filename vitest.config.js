// テストの対象は lib/ と scripts/ の素の関数。
// 画面の描画は Nuxt の環境が要るので、ここでは扱わない
// （一覧の並べ替えや絞り込みは lib/compare.js に出してある）。

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'

export default defineConfig({
  resolve: {
    alias: {
      // .vue から import するときと同じ書き方をテストでも使えるようにする
      '@': fileURLToPath(new URL('.', import.meta.url))
    }
  },
  test: {
    include: ['lib/**/*.test.js', 'scripts/**/*.test.js'],
    // 日付のテストがある。実行環境のタイムゾーンに左右されないよう UTC で走らせる
    // （Netlify のビルドも UTC）
    env: { TZ: 'UTC' }
  }
})
