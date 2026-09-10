"use strict";

// data/apple-podcasts.json を更新する。
//
// 番組ごとの Apple Podcasts のリンクを持つ。照合は iTunes Search API の
// 検索結果に含まれる feedUrl が data/rss.json の feed と一致するか、で行う。
// 番組名の近さで採用すると別番組を掴む（「ビットコイナー反省会」の検索結果には
// 別番組しか出てこない、など実例がある）。
//
// フィードURLが Apple 側と食い違う番組（配信元の移行、FeedBurner 経由など）は
// 自動では取れないので、"source": "manual" として手で書き足せるようにしてある。
// 既にファイルにある項目は自動処理では触らない。
//
// GitHub Actions から依存のインストールなしで動かせるよう、素の CommonJS で書く。
// node の https はプロキシ環境で動かないことがあるため通信は curl に任せる。
//
// 使い方:
//   node scripts/update-apple-podcasts.js            未登録の番組だけ調べる
//   node scripts/update-apple-podcasts.js --refresh  自動取得分を全て調べ直す
//
// Ref: https://github.com/noracast/podcastfreaks.com/issues/41

const { execFileSync } = require('child_process')
const fs = require('fs')

const RSS_JSON = 'data/rss.json'
const APPLE_JSON = 'data/apple-podcasts.json'
const BUILD_INFO = 'static/downloads/build_info.json'

// iTunes Search API は毎分20件程度に制限されている
const WAIT_MS = 3000

// ファイルを直接開いた人が、手で足せることに気づけるようにしておく。
// キーが番組と衝突しないよう先頭にアンダースコアを付ける
const README_KEY = '_readme'
const README_NOTE = 'source が auto-detect の項目は iTunes の検索APIでフィードURLが一致した番組です。Apple 側のフィードURLが違う番組は自動では特定できないので、{"id": 数値, "url": "...", "source": "manual"} の形で手で足してください。source が manual の項目は自動処理では触りません。詳しくは README.md の Contributing を参照。'

// 比較用にURLを正規化する（プロトコル・末尾スラッシュ・ホストの大小を無視）
const normalize = (url) => {
  const m = String(url || '').trim().match(/^(https?:)?\/\/([^/?#]+)(.*)$/i)
  if (!m) return String(url || '').trim()
  return `${m[2].toLowerCase()}${m[3]}`.replace(/\/+$/, '')
}

const fetchJson = (url) => {
  try {
    const out = execFileSync('curl', ['-s', '--max-time', '20', url], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
    return JSON.parse(out)
  } catch {
    return null
  }
}

const readJson = (path, fallback) => {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')) } catch { return fallback }
}

function updateApplePodcasts({ refresh = false } = {}) {
  const rss = readJson(RSS_JSON, {})
  const build = readJson(BUILD_INFO, { channels: {} })
  const current = readJson(APPLE_JSON, {})

  // 手で足した項目は常に残す。自動取得分は --refresh のときだけ調べ直す
  const kept = {}
  for (const [key, value] of Object.entries(current)) {
    if (key.startsWith('_')) continue // 説明文などのメタ項目
    if (!(key in rss)) continue // rss.json から消えた番組は落とす
    if (value.source === 'manual' || !refresh) kept[key] = value
  }

  const targets = Object.keys(rss).sort().filter(key => !(key in kept))
  const added = []
  const notFound = []

  targets.forEach((key, i) => {
    const title = (build.channels[key] || {}).title || key
    const url = `https://itunes.apple.com/search?media=podcast&country=JP&limit=50&term=${encodeURIComponent(title)}`
    const json = fetchJson(url)

    const found = json && (json.results || []).find(r => normalize(r.feedUrl) === normalize(rss[key].feed))
    if (found) {
      kept[key] = {
        id: found.collectionId,
        url: found.collectionViewUrl,
        source: 'auto-detect'
      }
      added.push(key)
    }
    else {
      // 見つからなかったものは記録しない。番組が後から Apple に登録されることも
      // あるので、次回また調べる
      notFound.push(key)
    }

    if (i < targets.length - 1) execFileSync('sleep', [String(WAIT_MS / 1000)])
  })

  // 説明文を先頭に置き、番組はキー順に並べて差分が読みやすい形にする
  const sorted = { [README_KEY]: README_NOTE }
  Object.keys(kept).sort().forEach(key => { sorted[key] = kept[key] })

  const json = JSON.stringify(sorted, null, 2) + '\n'
  const before = fs.existsSync(APPLE_JSON) ? fs.readFileSync(APPLE_JSON, 'utf8') : null
  const changed = before !== json
  if (changed) fs.writeFileSync(APPLE_JSON, json, 'utf8')

  return {
    total: Object.keys(rss).length,
    resolved: Object.keys(kept).length,
    manual: Object.values(kept).filter(v => v.source === 'manual').length,
    added,
    notFound,
    changed,
    path: APPLE_JSON
  }
}

module.exports = updateApplePodcasts
