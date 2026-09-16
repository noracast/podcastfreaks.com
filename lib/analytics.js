"use strict";

// GA4 へ操作のイベントを送る。
//
// gtag.js を読むのは plugins/gtag.client.js。除外中（?ga-optout=1）や
// 事前レンダリング中は window.gtag が無いので、何もせずに戻る。
// 呼ぶ側はそれを気にせず、操作が起きたところで呼べばよい。
//
// イベント名と引数の一覧は docs/analytics-events.md にまとめてある。
// 引数をレポートで使うには、GA の管理画面でカスタムディメンションとして
// 登録する必要がある（登録するまでは探索やリアルタイムでしか見えない）

// GA4 は引数の値を100文字で切る。切られる前にこちらで切っておくと、
// 送ったものと記録されたものが食い違わない
const MAX_VALUE_LENGTH = 100

export const clean = (params = {}) => {
  const out = {}
  for(const [key, value] of Object.entries(params)) {
    if(value == null || value === '') continue
    if(typeof value === 'boolean') {
      // 真偽値はレポートで扱いにくいので文字列にする
      out[key] = value ? 'true' : 'false'
      continue
    }
    out[key] = typeof value === 'string' ? value.slice(0, MAX_VALUE_LENGTH) : value
  }
  return out
}

// beacon は、ページを閉じる直前（pagehide）やフォームの送信で
// 画面が離れるときに使う。普通の送信だと届く前に切られることがある
export default function track(name, params, { beacon = false } = {}) {
  if(typeof window === 'undefined') return
  const payload = clean(params)
  if(beacon) payload.transport_type = 'beacon'
  // 手元では何が送られるかを見えるようにする（除外中でも出す）
  if(import.meta.dev) console.debug('[GA]', name, payload)
  if(typeof window.gtag !== 'function') return
  window.gtag('event', name, payload)
}

// 入力が止まってから送る。打っている途中の文字列（「reb」「rebu」…）を
// ひとつずつ送らないため
export function debounced(fn, wait) {
  let timer = null
  const call = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  call.cancel = () => clearTimeout(timer)
  return call
}
