"use strict";

// static/icon.png から、PWA とホーム画面追加に使うアイコンを作る。
//
// Nuxt 2 のときは @nuxtjs/pwa がビルドのたびに生成していたが、
// @vite-pwa/nuxt は作ってくれない。毎回作る必要のあるものでもないので、
// 元の絵を差し替えたときだけ手で走らせて、結果を git に入れておく。
//
//   pnpm icons
//
// sharp はカバー画像の処理でもう入っているので、依存は増えない。

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import consola from './logger.js'

const SOURCE = 'static/icon.png'
const DIST = 'static/img/icons'

// manifest 用。192 と 512 は PWA のインストールに要る決まりのサイズ。
// 残りは端末ごとの取り回し用で、Nuxt 2 が作っていたものに揃えてある
const SIZES = [64, 120, 144, 152, 192, 384, 512]

// iOS のホーム画面用。link rel="apple-touch-icon" から参照する。
// 透過を残すと iOS が黒く塗るので、背景を白で埋める
const APPLE_SIZE = 180

const main = async () => {
  if (!fs.existsSync(SOURCE)) {
    consola.error(`${SOURCE} が見つかりません`)
    process.exit(1)
  }
  fs.mkdirSync(DIST, { recursive: true })

  for (const size of SIZES) {
    const dist = path.join(DIST, `icon-${size}.png`)
    await sharp(SOURCE).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(dist)
    consola.log(`${dist} (${size}x${size})`)
  }

  const appleDist = path.join(DIST, `apple-touch-icon.png`)
  await sharp(SOURCE)
    .resize(APPLE_SIZE, APPLE_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(appleDist)
  consola.log(`${appleDist} (${APPLE_SIZE}x${APPLE_SIZE}、iOS 用に背景を白で埋めたもの)`)

  consola.success(`${SIZES.length + 1} 枚を作りました`)
}

main().catch(err => {
  consola.error(err.message)
  process.exit(1)
})
