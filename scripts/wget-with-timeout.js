"use strict";

import fs from 'fs'
import http from 'http'
import https from 'https'
import zlib from 'zlib'

// 無通信が続いた場合に打ち切るまでの時間（ミリ秒）
export const WGET_TIMEOUT = 30000

// リダイレクトを追う上限
const MAX_REDIRECTS = 10

const USER_AGENT = 'podcastfreaks.com/2.0 (+https://podcastfreaks.com/)'

// もとは node-wget-promise を使っていたが、以下の制約があり自前実装に置き換えた。
//
// - タイムアウトを持たず、応答を返さないホストで Promise が永久に解決しない
// - URL に非ASCII文字があると Node の https.request が例外を投げる
//   （例: propotype のカバー画像 ".../propoNEWカバー画像.png"）
// - リダイレクト先の Location が相対パスだと解決できず
//   「protocol should be http or https」で落ちる（例: airsap, ariel）
// - 301 / 302 / 307 しか追わず、308 / 303 は「unhandled status」として失敗扱い
// - User-Agent を送れない
// - Content-Encoding を無視して圧縮されたまま保存してしまう
//
// タイムアウトは総時間ではなく無通信時間で計る。総時間で打ち切ると、RSS が巨大で
// 単に時間のかかっているフィード（backspace.fm など）まで巻き添えになるため。
export default function wgetWithTimeout(src, options = {}, timeout = WGET_TIMEOUT) {
  return download(src, options, timeout, MAX_REDIRECTS)
}

function download(src, options, timeout, redirectsLeft) {
  return new Promise((resolve, reject) => {
    let target
    try {
      // WHATWG URL は非ASCII文字をパーセントエンコードしてくれる。
      // 既存のエンコード済み部分は二重にエンコードされない
      target = new URL(src)
    } catch (e) {
      reject(new Error(`Invalid URL: ${src}`))
      return
    }

    const client = target.protocol === 'https:' ? https : target.protocol === 'http:' ? http : null
    if (!client) {
      reject(new Error('protocol should be http or https'))
      return
    }

    const req = client.request(target, { headers: { 'User-Agent': USER_AGENT } }, res => {
      const status = res.statusCode

      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume() // 破棄してソケットを解放する
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects: ${src}`))
          return
        }
        // Location は相対パスのことがあるので、必ず今の URL を基準に解決する
        const next = new URL(res.headers.location, target).toString()
        download(next, options, timeout, redirectsLeft - 1).then(resolve, reject)
        return
      }

      if (status !== 200) {
        res.resume()
        reject(new Error(`Server responded with unhandled status: ${status}`))
        return
      }

      const fileSize = parseInt(res.headers['content-length'], 10) || 0
      let downloadedSize = 0

      // Accept-Encoding は送っていないが、それでも圧縮して返すサーバーがある
      // （例: radiotalk.jp）。そのまま保存すると XML として読めないので伸長する
      const decompressor = createDecompressor(res.headers['content-encoding'])
      const body = decompressor ? res.pipe(decompressor) : res

      const writeStream = fs.createWriteStream(options.output)
      body.pipe(writeStream)

      if (options.onStart) options.onStart(res.headers)

      res.on('data', chunk => {
        downloadedSize += chunk.length
        if (options.onProgress) {
          options.onProgress({
            fileSize,
            downloadedSize,
            percentage: fileSize > 0 ? downloadedSize / fileSize : 0
          })
        }
      })

      const fail = err => { writeStream.destroy(); reject(err) }
      res.on('error', fail)
      if (decompressor) decompressor.on('error', fail)

      writeStream.on('error', reject)
      writeStream.on('finish', () => resolve({ headers: res.headers, fileSize }))
    })

    // 無通信が timeout 続いたら中断する。データが流れている間は都度リセットされる
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Timeout: no progress for ${timeout / 1000}s`))
    })

    req.on('error', reject)
    req.end()
  })
}

function createDecompressor(contentEncoding) {
  switch (String(contentEncoding || '').toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return zlib.createGunzip()
    case 'deflate':
      return zlib.createInflate()
    case 'br':
      return zlib.createBrotliDecompress()
    default:
      return null
  }
}
