"use strict";

// 登録して良いフィードかを判定する（issue #231、もとは #48）。
//
// 登録リクエストのページ（/request/）はブラウザだけで動くので、フィード本体は
// 確かめられない。約3割のフィードが CORS を返さないため（#231 で実測）、
// 中身の検証はここ＝Actions 側が担う。
//
// ここはネットワークに触らない。xml2js が読んだあとのオブジェクトを受け取り、
// 判定だけする。取りに行くのは呼ぶ側（scripts/check-register-request.js）。
//
// 判定の基準は .claude/skills/add-channel/SKILL.md「3. フィードを検証する」
// と同じ。手でやっていたことを、そのまま機械に移したもの。

import normalizeFeed, { linkUrl } from './normalize-feed.js'
import PFUtil from './pf-util.js'

const util = new PFUtil()

const asArray = (value) => value == null ? [] : (Array.isArray(value) ? value : [value])

// <itunes:block>yes</itunes:block> のように、値で意味が変わる。
// 空の要素（<itunes:block/>）は「yes」とみなす配信元があるので、
// はっきり no と書いてある場合だけ通す
const isBlocked = (value) => {
  if (value == null) return false
  const text = String(typeof value === 'object' ? (value._ ?? '') : value).trim().toLowerCase()
  return text !== 'no' && text !== 'false'
}

const text = (value) => {
  if (typeof value === 'string') return value
  if (value && typeof value._ === 'string') return value._
  return null
}

// カバー画像の URL。itunes:image が最優先で、無ければ image/url
export function coverUrl(channel) {
  const itunes = channel['itunes:image']
  const fromItunes = itunes && itunes.$ && itunes.$.href
  if (fromItunes) return String(fromItunes).trim()
  const fromImage = channel.image && text(channel.image.url)
  return fromImage ? String(fromImage).trim() : null
}

export default function validateFeed(parsed) {
  const errors = []
  const warnings = []

  const channel = normalizeFeed(parsed)
  if (!channel) {
    // HTML を掴んでいることが多い。番組ページの URL をフィードとして
    // 送られた場合など
    errors.push('RSS としても Atom としても読めませんでした。フィードの URL ではないかもしれません。')
    return { ok: false, errors, warnings, info: {} }
  }

  const items = asArray(channel.item)
  const withAudio = util.countEpisodesWithAudio(items)
  const cover = coverUrl(channel)
  const info = {
    title: text(channel.title),
    link: linkUrl(channel.link),
    items: items.length,
    withAudio,
    cover,
    author: text(channel['itunes:author'])
  }

  if (!info.title) warnings.push('番組名（`<title>`）が読めませんでした。')

  if (items.length === 0) {
    errors.push('エピソード（`<item>` / `<entry>`）が1件もありません。')
  }

  // #48 の本題。記事用のフィードを掴んでいると、ここで落ちる
  if (items.length > 0 && withAudio === 0) {
    errors.push('音声（`<enclosure>`）を持つエピソードが1件もありません。記事用のフィードかもしれません。')
  }

  // 配信者が掲載を拒否している。scripts/fetch-feeds.js も一覧から外す
  if (isBlocked(channel['itunes:block']) || isBlocked(channel['podcast:block'])) {
    errors.push('`itunes:block` / `podcast:block` が指定されています。配信者が掲載を止めているので登録しません。')
  }

  // 収録時間は読めなくても登録は通す。/errors に警告が出るだけ
  if (items.length > 0) {
    // getDuration は読めれば 'HH:mm:ss'、駄目なら 'wrong-format' / 'zero'
    const readable = items.filter(item => /^\d+:\d{2}:\d{2}$/.test(util.getDuration(item['itunes:duration']))).length
    info.withDuration = readable
    if (readable === 0) {
      warnings.push('`itunes:duration` が1件も読めません。Duration は N/A になります。')
    }
  }

  if (!cover) warnings.push('カバー画像（`itunes:image`）がありません。一覧では灰色の四角になります。')

  return { ok: errors.length === 0, errors, warnings, info }
}
