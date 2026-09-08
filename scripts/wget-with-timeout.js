"use strict";

import wget from 'node-wget-promise'

// 無通信が続いた場合に打ち切るまでの時間（ミリ秒）
export const WGET_TIMEOUT = 30000

// node-wget-promise はタイムアウトを持たないため、レスポンスを返さないホストに
// 当たると Promise が永久に解決しない。
//
// ただし総時間で打ち切ると、RSS が巨大で単に時間がかかっている番組
// （backspace.fm など）まで巻き添えにしてしまう。そのため onStart / onProgress で
// タイマーをリセットし、「無通信が timeout 続いたら打ち切る」アイドルタイムアウトにする。
//
// 打ち切っても下層のソケットは開いたまま残りイベントループを掴み続けるので、
// 呼び出し側は処理の最後に process.exit() でプロセスを終了させること。
export default function wgetWithTimeout(src, options = {}, timeout = WGET_TIMEOUT) {
  let timer
  let fire
  const timedOut = new Promise((resolve, reject) => {
    fire = () => reject(new Error(`Timeout: no progress for ${timeout / 1000}s`))
  })

  const arm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => fire(), timeout)
  }

  const wrapped = Object.assign({}, options, {
    onStart: (headers) => {
      arm()
      if (options.onStart) options.onStart(headers)
    },
    onProgress: (progress) => {
      arm()
      if (options.onProgress) options.onProgress(progress)
    }
  })

  arm()
  return Promise.race([wget(src, wrapped), timedOut]).finally(() => clearTimeout(timer))
}
