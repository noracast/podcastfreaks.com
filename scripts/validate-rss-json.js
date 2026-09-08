"use strict";

// data/rss.json（と rss-inactive.json）の重複を検出する。
//
// JSON はキーが重複していても後勝ちで黙って読めてしまい、
// 同じフィードを二重に登録しても取得までは通ってしまうため、
// prebuild の最初にここで弾く。
//
// Ref: https://github.com/noracast/podcastfreaks.com/issues/88

import fs from 'fs'

// 重複判定用にフィードURLを正規化する。
// プロトコルの違い（http/https）、末尾のスラッシュ、ホスト名の大文字小文字は
// 同じフィードとみなす。パスとクエリは大文字小文字を区別する
const normalizeFeed = (feed) => {
  const value = String(feed || '').trim()
  const m = value.match(/^(https?:)?\/\/([^/?#]+)(.*)$/i)
  if (!m) return value.replace(/\/+$/, '')
  return `${m[2].toLowerCase()}${m[3]}`.replace(/\/+$/, '')
}

// JSON.parse ではキーの重複が消えてしまうので、生のテキストから拾う。
// data/rss.json はインデント2つの1階層なので、その行だけを見れば足りる
const findDuplicateKeys = (text) => {
  const seen = new Set()
  const duplicated = new Set()
  const re = /^ {2}"((?:[^"\\]|\\.)*)"\s*:/gm
  let m
  while ((m = re.exec(text)) !== null) {
    if (seen.has(m[1])) duplicated.add(m[1])
    seen.add(m[1])
  }
  return [...duplicated]
}

const groupBy = (entries, toKey) => {
  const groups = {}
  for (const [key, value] of entries) {
    const k = toKey(value)
    if (k == null || k === '') continue
    ;(groups[k] = groups[k] || []).push(key)
  }
  return groups
}

export default function validateRssJson(rssPath, inactivePath) {
  const errors = []
  const warnings = []

  const rssText = fs.readFileSync(rssPath, 'utf8')
  const rss = JSON.parse(rssText)
  const entries = Object.entries(rss)

  // キーの重複（後勝ちで消えてしまうため、生テキストから検出する）
  for (const key of findDuplicateKeys(rssText)) {
    errors.push(`キーが重複しています: "${key}"`)
  }

  // フィードURLの重複
  for (const [feed, keys] of Object.entries(groupBy(entries, v => normalizeFeed(v.feed)))) {
    if (keys.length > 1) errors.push(`フィードが重複しています: ${feed} (${keys.join(', ')})`)
  }

  // Twitter / ハッシュタグの重複。
  // 別番組が同じアカウントやタグを使うこともあり得るので警告に留める
  for (const [twitter, keys] of Object.entries(groupBy(entries, v => v.twitter && v.twitter.toLowerCase()))) {
    if (keys.length > 1) warnings.push(`Twitter が重複しています: ${twitter} (${keys.join(', ')})`)
  }
  for (const [hashtag, keys] of Object.entries(groupBy(entries, v => v.hashtag && v.hashtag.toLowerCase()))) {
    if (keys.length > 1) warnings.push(`ハッシュタグが重複しています: ${hashtag} (${keys.join(', ')})`)
  }

  // 登録中と登録解除済みの両方に載っているもの
  if (inactivePath && fs.existsSync(inactivePath)) {
    const inactive = JSON.parse(fs.readFileSync(inactivePath, 'utf8'))
    const inactiveFeeds = {}
    for (const [key, value] of Object.entries(inactive)) {
      inactiveFeeds[normalizeFeed(value.feed)] = key
    }
    for (const [key, value] of entries) {
      if (key in inactive) {
        errors.push(`rss-inactive.json にも同じキーがあります: "${key}"`)
      }
      const found = inactiveFeeds[normalizeFeed(value.feed)]
      if (found && found !== key) {
        errors.push(`rss-inactive.json の "${found}" と同じフィードです: "${key}" (${value.feed})`)
      }
    }
  }

  return { errors, warnings, count: entries.length }
}
