"use strict";

// Google アナリティクス（GA4）。
//
// 以前は @nuxtjs/google-analytics（vue-analytics ベース）で UA を読み込んでいたが、
// UA は 2023年7月に計測を停止しており、1.4MB のアプリバンドルに計測コードを
// 含めたうえで analytics.js を取得するだけの無駄な通信になっていた。
//
// GA4 用の Nuxt 2 モジュールは選択肢が乏しいので、gtag.js を直接読み込む。
// 依存が増えず、何が起きているかもここだけを見れば分かる。
//
// Ref: https://github.com/noracast/podcastfreaks.com/issues/47

const GA_ID = 'G-S5SV74H0TQ'

// 自分のアクセスを計測から外すための目印。
// ?ga-optout=1 を付けて開くと、そのブラウザでは以後送信しない（?ga-optout=0 で解除）。
// GA4 管理画面の「内部トラフィックの除外」は IP ベースなので、
// モバイル回線や外出先では効かない。ブラウザ単位で確実に効くこちらを使う
const OPTOUT_KEY = 'ga-optout'

// プライベートウィンドウなど localStorage が使えない環境でも落とさない
const storage = {
  get(key) {
    try { return window.localStorage.getItem(key) } catch (e) { return null }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value) } catch (e) { /* 保存できなくても続行 */ }
  },
  remove(key) {
    try { window.localStorage.removeItem(key) } catch (e) { /* 消せなくても続行 */ }
  }
}

// 除外中であることを画面から分かるようにする。
// レイアウト側は html[data-ga-optout] を見て印を出す（CSS だけで完結する）
const markOptout = (optout) => {
  if (optout) document.documentElement.setAttribute('data-ga-optout', '1')
  else document.documentElement.removeAttribute('data-ga-optout')
}

const applyOptoutParam = () => {
  const value = new URLSearchParams(window.location.search).get(OPTOUT_KEY)
  if (value === '1') {
    storage.set(OPTOUT_KEY, '1')
    console.log('[GA] このブラウザを計測対象から外しました（解除するには ?ga-optout=0）')
  }
  else if (value === '0') {
    storage.remove(OPTOUT_KEY)
    console.log('[GA] このブラウザの計測を再開しました')
  }
}

export default ({ app }) => {
  applyOptoutParam()

  const optout = !!storage.get(OPTOUT_KEY)
  markOptout(optout)

  // 除外中は gtag.js 自体を読み込まない
  if (optout) return

  window.dataLayer = window.dataLayer || []
  const gtag = function() { window.dataLayer.push(arguments) }
  window.gtag = gtag

  gtag('js', new Date())
  // ページビューは下の afterEach からまとめて送る。
  // Nuxt はハイドレーション時にも初回のルート遷移が走るため、
  // config の自動送信と併用すると初回が二重に計上される
  gtag('config', GA_ID, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  const sendPageView = (to) => {
    gtag('event', 'page_view', {
      page_path: to.fullPath,
      page_title: document.title,
      page_location: window.location.href
    })
  }

  // vue-meta が title を書き換えるのを待ってから送る。
  //
  // afterEach の直後はまだ前のページの title が入っており、
  // requestAnimationFrame を2回挟んでも間に合わなかった（1ページ分ずれて記録される）。
  // 書き換えを待つ時間は環境によって変わるので、時間で待たずに
  // <title> の変化そのものを見る。
  // 遷移前後で title が同じページもあるため、変化しなければ TITLE_WAIT 後に送る
  const TITLE_WAIT = 1000
  const sendAfterTitleUpdate = (to) => {
    const titleElement = document.querySelector('title')
    if (!titleElement) return sendPageView(to)

    let sent = false
    const send = () => {
      if (sent) return
      sent = true
      observer.disconnect()
      window.clearTimeout(timer)
      sendPageView(to)
    }
    const observer = new MutationObserver(send)
    observer.observe(titleElement, { childList: true, characterData: true, subtree: true })
    const timer = window.setTimeout(send, TITLE_WAIT)
  }

  // 初回の描画時点では title は既に正しいので、そのまま送る
  let firstRoute = true
  app.router.afterEach((to) => {
    if (firstRoute) {
      firstRoute = false
      return sendPageView(to)
    }
    sendAfterTitleUpdate(to)
  })
}
